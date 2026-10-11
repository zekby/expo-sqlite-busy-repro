import * as SQLite from 'expo-sqlite';
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

const expoSqliteVersion: string = require('expo-sqlite/package.json').version;

async function runRepro(log: (line: string) => void) {
  const db = SQLite.openDatabaseSync('repro.db');
  db.execSync('CREATE TABLE IF NOT EXISTS t (v INTEGER)');

  const holder = SQLite.openDatabaseSync('repro.db', { useNewConnection: true });
  holder.execSync('BEGIN IMMEDIATE');
  const stmt = db.prepareSync('INSERT INTO t (v) VALUES (?)');
  try {
    stmt.executeSync([1]);
    log('1 locked write: succeeded');
  } catch (e) {
    log('1 locked write: ' + (e as Error).message);
  }
  holder.execSync('ROLLBACK');
  holder.closeSync();

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync('INSERT INTO t (v) VALUES (2)');
    });
    log('2 next write: committed');
  } catch (e) {
    log('2 next write: ' + (e as Error).message);
  }
}

export default function App() {
  const [lines, setLines] = useState<string[]>([]);
  const run = () => {
    const collected: string[] = [];
    runRepro((line) => collected.push(line)).finally(() => setLines(collected));
  };
  return (
    <View style={styles.container}>
      <Text>expo-sqlite {expoSqliteVersion}</Text>
      <Button testID="run" title="Run" onPress={run} />
      <Text testID="result" accessibilityLabel={lines.join('\n')}>
        {lines.join('\n\n')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 80, gap: 16, backgroundColor: '#fff' },
});
