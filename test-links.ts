import { getCategoryLinks } from "./src/lib/firebaseService";

async function run() {
  const links = await getCategoryLinks();
  links.forEach(l => console.log(l.title, " -> ", l.url));
  process.exit(0);
}
run();
