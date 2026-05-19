// @ts-nocheck

import { MasterStore } from '../../lib/core/persistence/master-store';

const master = MasterStore.load();
const metrics = master.metrics;
const last = metrics[metrics.length - 1];

console.log('--- LAST METRIC ---');
console.log(JSON.stringify(last, null, 2));

console.log(`Metrics count: ${metrics.length}`);
