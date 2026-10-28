import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { color, layout, radius, shadow } from '@polechamp/tokens';
import { formatTournamentDate } from '@polechamp/i18n';
import type { ResultsResponse, TournamentDetails } from '@polechamp/contracts';
import { useOnline } from '../../data/network/online';
import { exportDeps, runExport, type ExportDeps, type ExportScope } from '../../data/org/exports';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Sheet, SheetHeader } from '../../ui/sheet';
import { Text } from '../../ui/Text';
import { toast } from '../../ui/Toast';

type Row = ResultsResponse['rows'][number];
const CATEGORY_STATUS = { DRAFT: 'DRAFT', IN_PROGRESS: 'IN_PROGRESS', LOCKED: 'LOCKED' } as const;

export interface PdfPreviewSheetProps {
  visible: boolean;
  onClose: () => void;
  tournament: Pick<TournamentDetails, 'id' | 'name' | 'startDate' | 'endDate' | 'venue' | 'categories'>;
  /** Zakres kategoria – identyfikator; brak = cały turniej. */
  categoryId?: string;
  results: ResultsResponse[] | undefined;
  deps?: ExportDeps;
}

const ranked = (rows: readonly Row[]) =>
  rows.filter((r) => r.entryStatus === 'ACTIVE' && r.official !== null);

/**
 * SCR-ORG-12 – podgląd i pobranie PDF (IMP-270). Podgląd z danych rankingu; plik generuje serwer
 * (ADR-009), aplikacja pobiera go i otwiera systemowy arkusz udostępniania.
 */
export function PdfPreviewSheet({
  visible,
  onClose,
  tournament,
  categoryId,
  results,
  deps = exportDeps,
}: PdfPreviewSheetProps) {
  const t = useT();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const names = new Map(tournament.categories.map((c) => [c.id, c.name]));
  const shown = (results ?? []).filter((r) => !categoryId || r.categoryId === categoryId);

  const download = async () => {
    const scope: ExportScope = categoryId
      ? { scope: 'CATEGORY', tournamentId: tournament.id, categoryId }
      : { scope: 'TOURNAMENT', tournamentId: tournament.id };
    setBusy(true);
    try {
      await runExport(scope, deps);
      toast.success('toasts:pdfSaved');
    } catch {
      toast.error('toasts:pdfFailed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      scroll={false}
      visible={visible}
      onClose={onClose}
      maxHeightRatio={0.86}
      accessibilityLabel={t('org:pdf.title')}
      testID="pdf-sheet"
    >
      <SheetHeader title={t('org:pdf.title')} />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card} testID="pdf-preview">
          <View style={styles.head}>
            <View style={styles.logo}>
              <Icon name="trophy" size={16} color={color.accent} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyS">{tournament.name}</Text>
              <Text variant="caption" color={color.neutral[400]}>
                {t('org:pdf.meta', {
                  date: formatTournamentDate(tournament.startDate, tournament.endDate),
                  place: tournament.venue ?? t('org:tournaments.placeTbd'),
                })}
              </Text>
            </View>
          </View>
          {shown.map((cat) => (
            <View key={cat.categoryId} style={styles.category}>
              <Text variant="meta">
                {categoryId
                  ? t('org:pdf.categoryTitle', {
                      name: names.get(cat.categoryId) ?? '',
                      status: t(`common:categoryStatus.${CATEGORY_STATUS[cat.status]}`),
                    })
                  : names.get(cat.categoryId)}
              </Text>
              {categoryId ? (
                <View style={styles.tableRow}>
                  <Text variant="caption" color={color.neutral[400]} style={styles.rank}>
                    {t('org:pdf.rank')}
                  </Text>
                  <Text variant="caption" color={color.neutral[400]} style={styles.flex}>
                    {t('org:pdf.athlete')}
                  </Text>
                  <Text variant="caption" color={color.neutral[400]}>
                    {t('org:pdf.score')}
                  </Text>
                </View>
              ) : null}
              {ranked(cat.rows).length ? (
                ranked(cat.rows).map((row) => (
                  <View key={row.entryId} style={styles.tableRow}>
                    <Text variant="caption" tabular color={color.neutral[400]} style={styles.rank}>
                      {t('org:pdf.place', { rank: row.rank ?? '' })}
                    </Text>
                    <View style={styles.flex}>
                      <Text variant="caption" numberOfLines={1}>
                        {row.fullName}
                      </Text>
                      {categoryId && row.club ? (
                        <Text variant="micro" color={color.neutral[400]} numberOfLines={1}>
                          {row.club}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="caption" tabular color={color.accentRamp[300]}>
                      {row.display}
                    </Text>
                  </View>
                ))
              ) : (
                <Text variant="caption" color={color.neutral[400]}>
                  {t('org:pdf.noResults')}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          testID="pdf-download"
          label={t(busy ? 'org:pdf.generating' : 'org:pdf.download')}
          icon="download-simple"
          size={48}
          fullWidth
          loading={busy}
          disabled={!online}
          onPress={() => void download()}
        />
        {online ? null : (
          <Text variant="caption" align="center" color={color.neutral[400]}>
            {t('org:pdf.offline')}
          </Text>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1 },
  card: {
    margin: layout[14],
    padding: layout[16],
    gap: layout[16],
    borderRadius: radius.lg,
    backgroundColor: color.bg,
    ...shadow.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: layout[10] },
  logo: {
    width: layout[34] - 2,
    height: layout[34] - 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  category: { gap: layout[6] },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: layout[8] },
  rank: { width: layout[22] },
  footer: { gap: layout[6], paddingTop: layout[14] },
});
