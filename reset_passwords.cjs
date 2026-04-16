const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.qbumfnkrqqsthmsgrhfi:LevaETraz2026%21@aws-1-sa-east-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(
    "UPDATE auth.users SET encrypted_password = crypt('112218', gen_salt('bf')) WHERE email IN ('joaoentregador@gmail.com', 'jardins@gmail.com') RETURNING email"
  );
  console.log('Senhas redefinidas para 112218:');
  res.rows.forEach(r => console.log(' -', r.email));
  await client.end();
}

run().catch(e => console.error('Erro:', e.message));

