// fetch-data.js
// Pulls Members + Contributions from Airtable and writes data.json.
// Runs inside the GitHub Action (.github/workflows/sync.yml) on a daily schedule.
// Requires Node 18+ (built-in fetch). No npm install needed.

const BASE_ID             = 'appGcZAF4Q9OB1XBD';
const MEMBERS_TABLE       = 'tblEaJu006iUOgFbe';
const CONTRIBUTIONS_TABLE = 'tbl352op4k49EsaUY';

const PAT = process.env.AIRTABLE_PAT;
if (!PAT) {
  console.error('Missing AIRTABLE_PAT environment variable (set as a repo secret).');
  process.exit(1);
}

const MEMBER_FIELDS = [
  'Member_Name','Monthly_Target','Annual_Target',
  'Total_Paid','Total_Months_Covered','Status','Completion_Rate',
  'Risk_Score','Risk_Level','Last_Payment_Date','Days_Since_Last_Payment','Stagnation_Risk'
];
const CONTRIBUTION_FIELDS = [
  'Member_Name','Amount_KES','Payment_Date','Months_Covered',
  'Note','Reference_Code','Members','Last_Payment_Date'
];

async function fetchAll(tableId, fields) {
  let records = [], offset = null;
  const fp = fields.map(f => `fields[]=${encodeURIComponent(f)}`).join('&');
  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${fp}${offset ? '&offset=' + offset : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${PAT}` } });
    if (!res.ok) {
      throw new Error(`Airtable error ${res.status}: ${await res.text()}`);
    }
    const d = await res.json();
    records = records.concat(d.records);
    offset = d.offset;
  } while (offset);
  return records;
}

async function main() {
  const [members, contributions] = await Promise.all([
    fetchAll(MEMBERS_TABLE, MEMBER_FIELDS),
    fetchAll(CONTRIBUTIONS_TABLE, CONTRIBUTION_FIELDS)
  ]);

  const fs = await import('node:fs/promises');
  await fs.writeFile('data.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    members,
    contributions
  }, null, 2));

  console.log(`Wrote data.json — ${members.length} members, ${contributions.length} contributions.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
