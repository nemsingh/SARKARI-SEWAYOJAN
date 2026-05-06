import { parse } from 'date-fns';

const parseDateTime = (dateString: string): Date | undefined => {
  if (!dateString) return undefined;
  let d = new Date(dateString);
  if (!isNaN(d.getTime())) return d;
  const noPipe = dateString.replace('|', '');
  d = new Date(noPipe);
  if (!isNaN(d.getTime())) return d;
  return undefined;
};

console.log("08 May 2026 | 12:30 PM parses to:", parseDateTime("08 May 2026 | 12:30 PM")?.toISOString());
console.log("03 May 2026 | 12:25 PM parses to:", parseDateTime("03 May 2026 | 12:25 PM")?.toISOString());
console.log("06 May 2026 | 12:25 PM parses to:", parseDateTime("06 May 2026 | 12:25 PM")?.toISOString());
