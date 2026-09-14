const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const updateFeature = (id, status, evidence) => {
  const f = data.features.find(x => x.id === id);
  if (f) {
    f.status = status;
    if (evidence) f.evidence.push(evidence);
  }
};
updateFeature('test-coupon-concurrency', 'passing', 'tester (2026-09-14): npm run test: tests passed. Added unique constraint error handling for milestone generation.');
updateFeature('test-transaction-integrity', 'in_progress', null);
fs.writeFileSync('feature_list.json', JSON.stringify(data, null, 2));
