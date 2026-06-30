module.exports = {

    avantis: {
        label: 'Allen & Heath Avantis Solo',
        ip: 'AVANTIS_IP_HERE',
        port: 51325,
        baseMidiChannel: 11,  // 0x0B — confirmed from working Lua reference
    },

    projectors: {
        port: 3629,  // ESC/VP21 default, shared by all units
        left: {
            ip: 'PROJECTOR_LEFT_IP_HERE',
            name: 'Projector Left',
            model: 'Epson EB-770F',
        },
        right: {
            ip: 'PROJECTOR_RIGHT_IP_HERE',
            name: 'Projector Right',
            model: 'Epson EB-770F',
        },
        rear: {
            ip: 'PROJECTOR_REAR_IP_HERE',
            name: 'Projector Rear',
            model: 'Epson EB-PU7000',
        },
    },

    blustream: {
        acm: {
            ip: 'ACM_IP_HERE',
            port: 23,  // Telnet
            model: 'Blustream ACM210',
        },
        inputs: {
            lectern: { id: '001', name: 'Lectern' },
            stage:  { id: '002', name: 'Stage' },
            ops: { id: '003', name: 'Ops'}
        },
        outputs: {
            projectorLeft:  { id: '001', name: 'Projector Left' },
            projectorRight: { id: '002', name: 'Projector Right' },
            projectorRear:  { id: '003', name: 'Projector Rear' },
        },
    },

    chamsys: {
        magicq: {
            label: 'Chamsys MagicQ PC',
            ip: 'MAGICQ_IP_HERE',
            port: 4911,
        },
        genetix10: {
            label: 'Chamsys GeNetix 10',
            ip: 'GEN_IP_HERE',
            port: 4911,
        }
    }

};
