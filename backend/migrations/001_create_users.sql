create table if not exists users (
  id integer primary key autoincrement,
  username varchar(64) not null unique,
  password_hash varchar(255) not null,
  role varchar(16) not null default 'viewer',
  created_at datetime not null default current_timestamp
);

create trigger if not exists users_role_check
before insert on users
for each row
when new.role not in ('admin', 'editor', 'viewer')
begin
  select raise(abort, 'invalid role');
end;
