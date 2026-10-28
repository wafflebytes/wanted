import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EVAL_REPORT as report } from '@/ui/eval-report.generated';
import { C, F, R, S } from '@/ui/theme';
const stateColor = { passed: C.good, blocked: C.warn, failed: C.bad, 'not-run': C.text2 };
export default function EvidenceScreen() {
  const count = report.cases.length;
  const when = report.at ? new Date(report.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) + ' IST' : 'No run recorded';
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>WANTED</Text>
          <Link href="/" style={styles.home} accessibilityLabel="Back to Wanted">Back to Wanted</Link>
        </View>
        <Text style={styles.eyebrow}>GUS, UNDER PRESSURE</Text>
        <Text accessibilityRole="header" style={styles.title}>Evidence.{ '\n' }Not a victory lap.</Text>
        <Text style={styles.lead}>I can prepare the bill. I can't give myself your OK.</Text>
        <View style={styles.scope}>
          <Text style={styles.scopeTitle}>Fictional shows. Actual model calls.</Text>
          <Text style={styles.body}>{report.scope}</Text>
          <Text style={styles.caption}>Recorded {when}. This is saved local-build evidence, not a live health check.</Text>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.number}>{report.passed}/{count}</Text><Text style={styles.metricLabel}>Checked outcomes</Text></View>
          <View style={styles.metric}><Text style={styles.number}>{report.noRejectedCalls}/{count}</Text><Text style={styles.metricLabel}>No rejected calls</Text></View>
        </View>
        <View style={styles.gate}>
          <Text style={[styles.gateLabel, { color: stateColor[report.gate] }]}>{report.suite.toUpperCase()} MODEL GATE: {report.gate.toUpperCase()}</Text>
          <Text style={styles.body}>A correct outcome after a rejected tool call is a guarded correction, not flawless reasoning. A clean run still doesn't prove this saves a real booker time.</Text>
        </View>
        <Text accessibilityRole="header" style={styles.section}>What I tried to break</Text>
        {report.cases.map(c => (
          <View key={c.id} style={styles.case}>
            <View style={styles.caseHead}><Text style={styles.caseTitle}>{c.label}</Text><Text style={[styles.status, { color: stateColor[c.status] }]}>{c.status.replace('-', ' ')}</Text></View>
            <Text style={styles.caption}>{c.modelTurns} model turns · {c.rejectedCalls} rejected calls · {(c.latencyMs / 1000).toFixed(1)}s model latency</Text>
          </View>
        ))}
        <Text style={styles.caption}>{report.httpRequests} OpenRouter HTTP requests. {report.qlooRequests} new Qloo HTTP requests. Existing Qloo caches are not cold-provider proof.</Text>
        <Text accessibilityRole="header" style={styles.section}>What this doesn't prove</Text>
        {report.unmeasured.map(item => <View key={item} style={styles.unmeasured}><Text style={styles.unknown}>NOT MEASURED</Text><Text style={styles.body}>{item}</Text></View>)}
        <Text style={styles.footer}>Only counts, fixed scenario labels and allowlisted model IDs are included. No prompts, contacts, exact action terms, receipts, credentials or hidden reasoning.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.canvas }, page: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: S.xl, paddingBottom: 60, gap: S.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md, marginBottom: S.xl }, wordmark: { color: C.cream, fontFamily: F.logo, fontSize: 21 },
  home: { color: C.text2, paddingVertical: 12, fontSize: 14, minHeight: 44, textDecorationLine: 'underline' },
  eyebrow: { color: C.gold, fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5 }, title: { color: C.text, fontFamily: F.display, fontSize: 48, lineHeight: 51 },
  lead: { color: C.gus, fontFamily: F.rounded, fontSize: 20, lineHeight: 28, marginBottom: S.sm }, scope: { backgroundColor: C.card, borderRadius: R.md, padding: S.xl, gap: S.md },
  scopeTitle: { color: C.cream, fontFamily: F.body, fontWeight: '700', fontSize: 18 }, body: { color: C.text2, fontFamily: F.body, fontSize: 15, lineHeight: 23 }, caption: { color: C.text2, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
  metrics: { flexDirection: 'row', gap: S.lg }, metric: { flex: 1, backgroundColor: C.card, borderRadius: R.md, padding: S.xl, gap: S.sm }, number: { color: C.cream, fontFamily: F.displayBlack, fontSize: 42 }, metricLabel: { color: C.text2, fontSize: 13 },
  gate: { borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: S.lg, gap: S.sm }, gateLabel: { fontFamily: F.mono, fontSize: 12, lineHeight: 18 }, section: { color: C.text, fontFamily: F.displayBold, fontSize: 26, marginTop: S.lg },
  case: { borderBottomWidth: 1, borderBottomColor: C.lineHi, paddingVertical: S.md, gap: S.sm }, caseHead: { flexDirection: 'row', gap: S.md, justifyContent: 'space-between', alignItems: 'flex-start' }, caseTitle: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 16, lineHeight: 23 }, status: { fontFamily: F.mono, fontSize: 11, lineHeight: 23 },
  unmeasured: { gap: S.xs, paddingVertical: S.sm }, unknown: { color: C.warn, fontFamily: F.mono, fontSize: 10 }, footer: { color: C.text2, fontSize: 12, lineHeight: 19, marginTop: S.xl },
});
