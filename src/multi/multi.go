package multi

/*
#cgo linux LDFLAGS: -lmultitoon
#cgo windows LDFLAGS: -lmultitoon -L${SRCDIR}/../../lib
#cgo darwin LDFLAGS: -L${SRCDIR}/../../lib -lmultitoon -lSystem -framework Carbon -framework CoreFoundation -framework CoreGraphics
#cgo CFLAGS: -I/usr/include/multitoon
#include <stdlib.h>
#include "mtlib.h"
*/
import "C"

import (
	"errors"
	"fmt"
	"runtime"
	"sync"
	"unsafe"

	"github.com/rs/zerolog/log"
)

type Session struct {
	ptr *C.mtlib_session_t
}

var multiLock sync.Mutex

func Init() (*Session, error) {
	mtlib_pointer := C.mtlib_init()
	if mtlib_pointer == nil {
		return nil, errors.New("mtlib_init failed to init")
	}

	mtlib_session := &Session{ptr: mtlib_pointer}

	runtime.SetFinalizer(mtlib_session, func(s *Session) {
		if s.ptr != nil {
			C.mtlib_shutdown(s.ptr)
			s.ptr = nil
		}
	})
	return mtlib_session, nil
}

func (s *Session) Shutdown() {
	if s == nil || s.ptr == nil {
		return
	}
	C.mtlib_shutdown(s.ptr)
	s = nil
	runtime.SetFinalizer(s, nil)
}

func (s *Session) SelectWindow() C.uint64_t {
	if s == nil || s.ptr == nil {
		return 0
	}
	window := C.mtlib_select_window(s.ptr)
	return window
}

func (s *Session) SetKeyDown(window uint64, key string) error {
	multiLock.Lock()
	defer multiLock.Unlock()
	if s == nil || s.ptr == nil {
		return errors.New("session is nil")
	}

	cs := C.CString(key)
	defer C.free(unsafe.Pointer(cs))
	C.mtlib_set_key_down(s.ptr, C.uint64_t(window), cs)
	return nil
}

func (s *Session) SetKeyUp(window uint64, key string) error {
	multiLock.Lock()
	defer multiLock.Unlock()
	if s == nil || s.ptr == nil {
		return errors.New("session is nil")
	}

	cs := C.CString(key)
	defer C.free(unsafe.Pointer(cs))
	C.mtlib_set_key_up(s.ptr, C.uint64_t(window), cs)
	return nil
}

func (s *Session) SendKey(window uint64, key string) error {
	if s == nil || s.ptr == nil {
		return errors.New("session is nil")
	}

	cs := C.CString(key)
	defer C.free(unsafe.Pointer(cs))
	C.mtlib_send_key(s.ptr, C.uint64_t(window), cs)
	return nil
}

func (s *Session) GetWindowFromPID(pid int) C.uint64_t {
	if s == nil || s.ptr == nil {
		return 0
	}

	window := C.mtlib_get_window_from_pid(s.ptr, C.int(pid))
	log.Info().Msg(fmt.Sprintf("Window: %d, pid: %d", window, pid))
	return window
}

// ListenAndSyncClicks blocks until StopListening is called for this session,
// so callers should run it on its own goroutine.
func (s *Session) ListenAndSyncClicks(key string, windows []uint64) error {
	if s == nil || s.ptr == nil {
		return errors.New("session is nil")
	}

	cs := C.CString(key)
	defer C.free(unsafe.Pointer(cs))

	cWindows := make([]C.uint64_t, len(windows))
	for i, w := range windows {
		cWindows[i] = C.uint64_t(w)
	}

	var windowsPtr *C.uint64_t
	if len(cWindows) > 0 {
		windowsPtr = &cWindows[0]
	}

	C.mtlib_listen_and_sync_clicks(s.ptr, cs, windowsPtr, C.size_t(len(windows)))
	return nil
}

func (s *Session) StopListening() error {
	if s == nil || s.ptr == nil {
		return errors.New("session is nil")
	}
	C.mtlib_stop_listening(s.ptr)
	return nil
}
