import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const file = readFileSync(envPath, "utf-8");
    file
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .forEach((line) => {
        const eqIndex = line.indexOf("=");
        if (eqIndex === -1) return;
        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();
        if (
          (value.startsWith(`"`) && value.endsWith(`"`)) ||
          (value.startsWith(`'`) && value.endsWith(`'`))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      });
  } catch (error) {
    console.warn(
      "Hinweis: .env.local konnte nicht geladen werden. Stelle sicher, dass die Datei existiert.",
      error instanceof Error ? error.message : error
    );
  }
}

async function main() {
  loadEnvFile();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Fehlende Umgebungsvariablen: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein."
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (error) {
    console.error("Supabase-Verbindung fehlgeschlagen:", error);
    process.exitCode = 1;
    return;
  }

  const count = data?.users?.length ?? 0;
  console.log(
    `Supabase-Verbindung erfolgreich. Beispiel-Request lieferte ${count} Nutzer(e).`
  );
}

main().catch((err) => {
  console.error("Unerwarteter Fehler bei der Supabase-Prüfung:", err);
  process.exitCode = 1;
});

