import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { PortfolioHeader } from '@/components/home/portfolio-header';
import { PortfolioHero } from '@/components/home/portfolio-hero';
import { SummaryCards } from '@/components/home/summary-cards';
import { HoldingsList } from '@/components/home/holdings-list';
import type { HoldingItem } from '@/components/home/holding-row';

const MOCK_HOLDINGS: HoldingItem[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', value: 185.20, pnl: 24.30, pnlPercent: 15.1 },
  { ticker: 'VOO', name: 'Vanguard S&P 500', value: 410.15, pnl: 88.10, pnlPercent: 27.3 },
  { ticker: 'TSLA', name: 'Tesla, Inc.', value: 168.45, pnl: -12.20, pnlPercent: -6.7 },
  { ticker: 'BITO', name: 'Bitcoin Strat ETF', value: 22.40, pnl: 5.10, pnlPercent: 29.4 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', value: 420.80, pnl: 35.60, pnlPercent: 9.2 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', value: 875.30, pnl: 210.50, pnlPercent: 31.7 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', value: 198.60, pnl: -8.40, pnlPercent: -4.1 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', value: 172.90, pnl: 18.70, pnlPercent: 12.1 },
  { ticker: 'META', name: 'Meta Platforms', value: 530.45, pnl: 95.20, pnlPercent: 21.9 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', value: 445.10, pnl: -22.30, pnlPercent: -4.8 },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <PortfolioHeader />
        <PortfolioHero totalValue={1210.05} netPnl={150.20} netPnlPercent={14.1} />
        <SummaryCards totalInvested={1045.30} totalFees={12.55} totalDividends={2.00} />
        <HoldingsList
          holdings={MOCK_HOLDINGS}
          onPressHolding={(ticker) => router.push(`/stock/${ticker}`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
