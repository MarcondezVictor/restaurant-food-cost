begin;

select plan(1);

select is(1 + 1, 2, 'trivial pgTAP test');

select * from finish();
rollback;
