# expo-sqlite: one SQLITE_BUSY leaves a write statement running, and every later COMMIT fails

Minimal repro for an expo-sqlite iOS bug (expo-sqlite 57.0.4, SDK 57).

## Run

```sh
npm install
npx expo run:ios
```

Tap **Run**. The app opens one connection, takes the write lock on a second connection
(`useNewConnection: true` + `BEGIN IMMEDIATE`), runs one write on the first connection
(fails with `database is locked`, as expected), releases the lock and closes the second
connection, then runs an ordinary `withTransactionAsync` write.

## Expected

```
1 locked write: ... database is locked
2 next write: committed
```

## Actual

```
1 locked write: ... SQLiteErrorException: Error code 5: database is locked (at ExpoSQLite/SQLiteModule.swift:416)
2 next write: ... SQLiteErrorException: cannot commit transaction - SQL statements in progress (at ExpoSQLite/SQLiteModule.swift:360)
```

Every later transaction on that connection fails the same way until the statement is
finalized or the app restarts.

## Why

When a step fails with `SQLITE_BUSY`, SQLite keeps the statement mid-run so it can be
retried, and it still counts as an active write. `run()` in `ios/SQLiteModule.swift` throws
without `sqlite3_reset`, so the connection keeps an active write statement and `COMMIT`
refuses with "SQL statements in progress". `step()` and `getAll()` throw the same way.

`plugins/with-uiscene-lifecycle.js` is unrelated to the bug. It is only needed because apps
built with the iOS 27 SDK trap at launch without the UIScene lifecycle (expo/expo#46664).
