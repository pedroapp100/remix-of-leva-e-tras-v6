const {Client}=require('pg');
const c=new Client({connectionString:'postgresql://postgres.qbumfnkrqqsthmsgrhfi:LevaETraz2026%21@aws-1-sa-east-1.pooler.supabase.com:5432/postgres'});
c.connect().then(async()=>{
  const u=await c.query('SELECT id FROM auth.users WHERE email=',['jardins@gmail.com']);
  const cl=await c.query('SELECT id, profile_id, nome, email FROM clientes WHERE email=',['jardins@gmail.com']);
  const rls=await c.query("SELECT polname, polcmd, pg_get_expr(polqual,polrelid) as using_expr FROM pg_policy WHERE polrelid='public.clientes'::regclass");
  console.log('auth_id:', u.rows[0]?.id);
  console.log('cliente:', JSON.stringify(cl.rows[0]));
  console.log('policies:', JSON.stringify(rls.rows));
  c.end();
}).catch(e=>console.error(e.message));
