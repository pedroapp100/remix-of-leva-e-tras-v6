import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  "https://qbumfnkrqqsthmsgrhfi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFidW1mbmtycXFzdGhtc2dyaGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzM0OTIsImV4cCI6MjA5MTI0OTQ5Mn0.CYVliRU5Nk4UktTAKpLbNrZhOwzcslU7IdGGCjCuWe0"
);
await supabase.auth.signInWithPassword({ email: "pedroaps100@gmail.com", password: "Pedro123@" });
const { data } = await supabase.from("entregadores").select("id, nome").ilike("nome", "%bruno%");
console.log(JSON.stringify(data, null, 2));
