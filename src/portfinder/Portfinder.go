package portfinder

import (
	"errors"
	"fmt"

	psnet "github.com/shirou/gopsutil/v4/net"
)

var ErrNotFound = errors.New("portfinder: pid is not listening on any candidate port")

const tcpListenStatus = "LISTEN"
func PortForPID(pid int, candidatePorts []int) (int, error) {
	conns, err := psnet.ConnectionsPid("tcp", int32(pid))
	if err != nil {
		return 0, fmt.Errorf("portfinder: querying connections for pid %d: %w", pid, err)
	}

	want := make(map[uint32]int, len(candidatePorts))
	for _, p := range candidatePorts {
		want[uint32(p)] = p
	}

	for _, conn := range conns {
		if conn.Status != tcpListenStatus {
			continue
		}
		if port, ok := want[conn.Laddr.Port]; ok {
			return port, nil
		}
	}

	return 0, ErrNotFound
}
