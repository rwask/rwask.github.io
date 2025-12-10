// SolarWinds Demo Data - 11 accounts & 13 visitors
const accounts = [
  { id: 'acc-sw-prod-001', name: 'SolarWinds Production', plan: 'Enterprise', mrr: 50000 },
  { id: 'acc-sw-staging-001', name: 'SolarWinds Staging', plan: 'Professional', mrr: 25000 },
  { id: 'acc-sw-dev-001', name: 'SolarWinds Development', plan: 'Professional', mrr: 25000 },
  { id: 'acc-sw-test-001', name: 'SolarWinds Testing', plan: 'Professional', mrr: 15000 },
  { id: 'acc-sw-demo-001', name: 'SolarWinds Demo', plan: 'Enterprise', mrr: 35000 },
  { id: 'acc-sw-backup-001', name: 'SolarWinds Backup', plan: 'Professional', mrr: 20000 },
  { id: 'acc-sw-dr-001', name: 'SolarWinds DR', plan: 'Enterprise', mrr: 45000 },
  { id: 'acc-sw-analytics-001', name: 'SolarWinds Analytics', plan: 'Enterprise', mrr: 55000 },
  { id: 'acc-sw-monitor-001', name: 'SolarWinds Monitoring', plan: 'Professional', mrr: 30000 },
  { id: 'acc-sw-alerts-001', name: 'SolarWinds Alerts', plan: 'Enterprise', mrr: 40000 },
  { id: 'acc-sw-reports-001', name: 'SolarWinds Reports', plan: 'Professional', mrr: 22000 }
];

const visitors = [
  { id: 'visitor-sc-001', name: 'Sarah Chen', email: 'sarah.chen@solarwinds.com', role: 'Admin', accountIdx: 0 },
  { id: 'visitor-mj-001', name: 'Mike Johnson', email: 'mike.johnson@solarwinds.com', role: 'Manager', accountIdx: 0 },
  { id: 'visitor-ed-001', name: 'Emily Davis', email: 'emily.davis@solarwinds.com', role: 'Analyst', accountIdx: 1 },
  { id: 'visitor-jw-001', name: 'James Wilson', email: 'james.wilson@solarwinds.com', role: 'User', accountIdx: 2 },
  { id: 'visitor-la-001', name: 'Lisa Anderson', email: 'lisa.anderson@solarwinds.com', role: 'Admin', accountIdx: 3 },
  { id: 'visitor-dm-001', name: 'David Martinez', email: 'david.martinez@solarwinds.com', role: 'Manager', accountIdx: 4 },
  { id: 'visitor-kt-001', name: 'Karen Taylor', email: 'karen.taylor@solarwinds.com', role: 'Analyst', accountIdx: 5 },
  { id: 'visitor-rb-001', name: 'Robert Brown', email: 'robert.brown@solarwinds.com', role: 'User', accountIdx: 6 },
  { id: 'visitor-jw-002', name: 'Jennifer White', email: 'jennifer.white@solarwinds.com', role: 'Admin', accountIdx: 7 },
  { id: 'visitor-cg-001', name: 'Chris Garcia', email: 'chris.garcia@solarwinds.com', role: 'User', accountIdx: 8 },
  { id: 'visitor-am-001', name: 'Amanda Miller', email: 'amanda.miller@solarwinds.com', role: 'Manager', accountIdx: 9 },
  { id: 'visitor-tk-001', name: 'Tom Kim', email: 'tom.kim@solarwinds.com', role: 'Analyst', accountIdx: 10 },
  { id: 'visitor-sp-001', name: 'Susan Park', email: 'susan.park@solarwinds.com', role: 'User', accountIdx: 10 }
];

let currentVisitorIdx = parseInt(localStorage.getItem('currentVisitorIdx') || '0');
let currentAccountIdx = parseInt(localStorage.getItem('currentAccountIdx') || '0');

function initPendo() {
  const visitor = visitors[currentVisitorIdx];
  const account = accounts[currentAccountIdx];

  pendo.initialize({
    visitor: {
      id: visitor.id,
      email: visitor.email,
      firstName: visitor.name.split(' ')[0],
      lastName: visitor.name.split(' ')[1],
      role: visitor.role
    },
    account: {
      id: account.id,
      accountName: account.name,
      payingStatus: account.plan,
      mrr: account.mrr,
      industry: 'Technology'
    }
  });

  const userEl = document.getElementById('current-user');
  const accountEl = document.getElementById('current-account');
  if (userEl) userEl.textContent = visitor.name;
  if (accountEl) accountEl.textContent = account.name;

  console.log('🔄 Pendo initialized:', visitor.name, '@', account.name);
}

function switchUser() {
  currentVisitorIdx = (currentVisitorIdx + 1) % visitors.length;
  currentAccountIdx = visitors[currentVisitorIdx].accountIdx;
  localStorage.setItem('currentVisitorIdx', currentVisitorIdx);
  localStorage.setItem('currentAccountIdx', currentAccountIdx);
  initPendo();
  alert('Switched to: ' + visitors[currentVisitorIdx].name);
}

function switchAccount() {
  currentAccountIdx = (currentAccountIdx + 1) % accounts.length;
  localStorage.setItem('currentAccountIdx', currentAccountIdx);
  initPendo();
  alert('Switched to account: ' + accounts[currentAccountIdx].name);
}

function trackFeature(featureId) {
  pendo.track('FeatureClick', { featureId: featureId, timestamp: Date.now() });
  console.log('📍 Tracked:', featureId);
  alert('Feature clicked: ' + featureId);
}

function trackCustomEvent(eventName) {
  pendo.track(eventName, { source: window.location.pathname, timestamp: Date.now() });
  console.log('🎯 Custom event:', eventName);
  alert('Custom event fired: ' + eventName);
}

// Initialize on load
window.addEventListener('load', () => {
  setTimeout(initPendo, 500);
});
