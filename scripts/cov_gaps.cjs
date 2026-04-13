const cov = require('../coverage/coverage-final.json');
const files = ['PaperTrading','FactorLab','BacktestForm','Marketplace','Monitoring','EquityCurveChart','PortfolioManagement','Strategies','Dashboard','StrategyParameterForm','AccountSecurity','Settings','App'];
for (const name of files) {
  const entry = Object.entries(cov).find(([k]) => k.includes(name + '.tsx'));
  if (entry === undefined) continue;
  const [path, data] = entry;
  const s = data.s || {};
  const sm = data.statementMap || {};
  const uncov = [];
  for (const [id, count] of Object.entries(s)) {
    if (count === 0) uncov.push(sm[id]?.start?.line);
  }
  uncov.sort((a,b) => a-b);
  const total = Object.keys(s).length;
  const covered = Object.values(s).filter(v => v > 0).length;
  console.log(name + ': ' + covered + '/' + total + ' (' + (100*covered/total).toFixed(1) + '%) uncov=' + JSON.stringify(uncov));
}
