import 'package:flutter_test/flutter_test.dart';
import 'package:sqlite3/sqlite3.dart';

void main() {
  test('sqlite3 in-memory works on host', () {
    final db = sqlite3.openInMemory();
    db.execute('create table t (id integer primary key, name text)');
    db.execute("insert into t (name) values ('点点')");
    final rows = db.select('select name from t');
    expect(rows.single['name'], '点点');
    db.close();
  });
}
