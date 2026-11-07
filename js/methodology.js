[[PEAQ_UNITS[0], 'did:peaq:courier-01', 'PQ Courier · Delivery', { mcr: 'BB', mcr_score: 46, bond_status: 'bonded', event_count: 640, revenue_trend: 'up', operator: 'did:peaq:0xpeaqfleet' }, 'PQ Courier, rated BB'],
 [PEAQ_UNITS[1], 'did:peaq:operator-01', 'PQ Operator · Humanoid', { mcr: 'Provisioned', mcr_score: 0, bond_status: 'bonded', event_count: 0, operator: 'did:peaq:0xpeaqfleet' }, 'PQ Operator, not yet rated'],
 [PEAQ_UNITS[2], 'did:peaq:listener-01', 'PQ Listener · Sensor', { mcr: 'AA', mcr_score: 82, bond_status: 'bonded', event_count: 2400, machine_type: 'sensor', operator: 'did:peaq:0xpeaqfleet' }, 'PQ Listener, rated AA'],
 [PEAQ_UNITS[3], 'did:peaq:arcade-01', 'PQ Arcade · Claw machine', { mcr: 'AAA', mcr_score: 95, bond_status: 'bonded', event_count: 5200, machine_type: 'claw machine', operator: 'did:peaq:0xpeaqfleet' }, 'PQ Arcade, rated AAA']
].forEach(([u, did, name, data, cap]) => {
  const f = document.createElement('figure'), cv = document.createElement('canvas'), fc = document.createElement('figcaption');
  fc.textContent = cap; f.appendChild(cv); f.appendChild(fc); document.getElementById('figs').appendChild(f);
  new Sheet(cv, peaqModel(did, data, u, name), 640).draw(4000);
});
