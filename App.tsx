import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useNewsFeed } from './src/hooks/useNewsFeed';
import { Article, NewsCategory } from './src/types/news';
import { formatPublishedLabel, formatReadingTime } from './src/utils/format';
import { palette, shadows, spacing, typography } from './src/constants/theme';

const categories: NewsCategory[] = [
  'general',
  'world',
  'business',
  'technology',
  'health',
  'science',
  'sports',
];

const SAVED_STORIES_KEY = 'pulsewire.savedStories';

type TabKey = 'home' | 'saved' | 'discover';

function FeaturedStoryCard({
  article,
  isSaved,
  onPress,
  onToggleSaved,
}: {
  article: Article;
  isSaved: boolean;
  onPress: () => void;
  onToggleSaved: () => void;
}) {
  return (
    <Pressable style={styles.featuredCard} onPress={onPress}>
      <Image source={{ uri: article.imageUrl }} style={styles.featuredImage} />
      <LinearGradient
        colors={['transparent', 'rgba(15, 23, 42, 0.82)']}
        style={styles.featuredOverlay}
      />
      <View style={styles.featuredContent}>
        <View style={styles.featuredTopRow}>
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>{article.category.toUpperCase()}</Text>
            <Text style={styles.badgeDivider}>|</Text>
            <Text style={styles.badge}>{formatReadingTime(article.description)}</Text>
          </View>
          <Pressable onPress={onToggleSaved} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{isSaved ? 'Saved' : 'Save'}</Text>
          </Pressable>
        </View>
        <Text style={styles.featuredTitle}>{article.title}</Text>
        <Text style={styles.featuredSummary} numberOfLines={2}>
          {article.description}
        </Text>
        <Text style={styles.featuredMeta}>
          {article.source} | {formatPublishedLabel(article.publishedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

function BriefingRow({
  article,
  isSaved,
  onPress,
  onToggleSaved,
}: {
  article: Article;
  isSaved: boolean;
  onPress: () => void;
  onToggleSaved: () => void;
}) {
  return (
    <Pressable style={styles.listCard} onPress={onPress}>
      <View style={styles.listTextWrap}>
        <View style={styles.listHeaderRow}>
          <Text style={styles.listKicker}>{article.source}</Text>
          <Pressable onPress={onToggleSaved}>
            <Text style={styles.inlineAction}>{isSaved ? 'Saved' : 'Save'}</Text>
          </Pressable>
        </View>
        <Text style={styles.listTitle} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={styles.listSummary} numberOfLines={2}>
          {article.description}
        </Text>
        <Text style={styles.listMeta}>
          {formatPublishedLabel(article.publishedAt)} | {article.category}
        </Text>
      </View>
      <Image source={{ uri: article.imageUrl }} style={styles.listImage} />
    </Pressable>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const {
    articles,
    activeCategory,
    isLoading,
    isRefreshing,
    sourceLabel,
    setActiveCategory,
    refresh,
  } = useNewsFeed(categories[0]);

  const filteredArticles = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return articles;
    }

    return articles.filter((article) => {
      return (
        article.title.toLowerCase().includes(normalized) ||
        article.description.toLowerCase().includes(normalized) ||
        article.source.toLowerCase().includes(normalized)
      );
    });
  }, [articles, query]);

  const featuredArticle = filteredArticles[0];
  const briefingArticles = filteredArticles.slice(1);
  const savedArticles = useMemo(
    () => articles.filter((article) => savedIds.includes(article.id)),
    [articles, savedIds],
  );
  const trendingSources = useMemo(() => {
    return Array.from(new Set(articles.map((article) => article.source))).slice(0, 4);
  }, [articles]);

  function toggleSaved(articleId: string) {
    setSavedIds((current) =>
      current.includes(articleId)
        ? current.filter((id) => id !== articleId)
        : [...current, articleId],
    );
  }

  function openArticle(article: Article) {
    setSelectedArticle(article);
  }

  useEffect(() => {
    async function loadSavedIds() {
      try {
        const stored = await AsyncStorage.getItem(SAVED_STORIES_KEY);
        if (stored) {
          setSavedIds(JSON.parse(stored));
        }
      } catch {
        setSavedIds([]);
      }
    }

    loadSavedIds();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(SAVED_STORIES_KEY, JSON.stringify(savedIds)).catch(() => {
      return;
    });
  }, [savedIds]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={palette.pageGlow} style={styles.background}>
          <FlatList
            ListHeaderComponent={
              <View>
                <View style={styles.heroSection}>
                  <View>
                    <Text style={styles.eyebrow}>
                      {activeTab === 'home'
                        ? 'Daily Briefing'
                        : activeTab === 'saved'
                          ? 'Your Library'
                          : 'Discover'}
                    </Text>
                    <Text style={styles.headline}>
                      {activeTab === 'home'
                        ? 'A better looking way to read the news.'
                        : activeTab === 'saved'
                          ? 'Stories you bookmarked for later.'
                          : 'Browse the day by category and source.'}
                    </Text>
                  </View>
                  <Text style={styles.sourceChip}>{sourceLabel}</Text>
                </View>

                <View style={styles.tabBar}>
                  {(['home', 'discover', 'saved'] as TabKey[]).map((tab) => {
                    const selected = tab === activeTab;
                    return (
                      <Pressable
                        key={tab}
                        style={[styles.tabButton, selected && styles.tabButtonActive]}
                        onPress={() => setActiveTab(tab)}
                      >
                        <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.searchShell}>
                  <TextInput
                    placeholder="Search headlines, sources, topics"
                    placeholderTextColor={palette.muted}
                    value={query}
                    onChangeText={setQuery}
                    style={styles.searchInput}
                  />
                </View>

                <View style={styles.debugBar}>
                  <Text style={styles.debugText}>Category: {activeCategory}</Text>
                  <Text style={styles.debugDivider}>|</Text>
                  <Text style={styles.debugText}>Stories: {articles.length}</Text>
                  <Text style={styles.debugDivider}>|</Text>
                  <Text style={styles.debugText} numberOfLines={1}>
                    {sourceLabel}
                  </Text>
                </View>

                {(activeTab === 'home' || activeTab === 'discover') && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryRail}
                  >
                    {categories.map((category) => {
                      const selected = category === activeCategory;
                      return (
                        <Pressable
                          key={category}
                          onPress={() => setActiveCategory(category)}
                          style={[styles.categoryPill, selected && styles.categoryPillActive]}
                        >
                          <Text
                            style={[styles.categoryText, selected && styles.categoryTextActive]}
                          >
                            {category}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}

                {activeTab === 'discover' && (
                  <View style={styles.discoverPanel}>
                    <View style={styles.statsRow}>
                      <StatCard label="Stories" value={String(filteredArticles.length)} />
                      <StatCard label="Sources" value={String(trendingSources.length)} />
                      <StatCard label="Saved" value={String(savedIds.length)} />
                    </View>
                    <View style={styles.sourceList}>
                      {trendingSources.map((source) => (
                        <View key={source} style={styles.sourcePill}>
                          <Text style={styles.sourcePillText}>{source}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {activeTab === 'saved' ? (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Saved Stories</Text>
                    <Text style={styles.sectionMeta}>{savedArticles.length} saved</Text>
                  </View>
                ) : (
                  <>
                    {isLoading && !featuredArticle ? (
                      <View style={styles.loaderWrap}>
                        <ActivityIndicator size="large" color={palette.accent} />
                        <Text style={styles.loaderText}>Loading the latest stories...</Text>
                      </View>
                    ) : featuredArticle ? (
                      <FeaturedStoryCard
                        article={featuredArticle}
                        isSaved={savedIds.includes(featuredArticle.id)}
                        onPress={() => openArticle(featuredArticle)}
                        onToggleSaved={() => toggleSaved(featuredArticle.id)}
                      />
                    ) : (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No stories matched your search.</Text>
                        <Text style={styles.emptyText}>Try a different keyword or refresh the feed.</Text>
                      </View>
                    )}

                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        {activeTab === 'home' ? 'Top Briefings' : 'Discover More'}
                      </Text>
                      <Text style={styles.sectionMeta}>{briefingArticles.length} stories</Text>
                    </View>
                  </>
                )}

                {activeTab === 'saved' && savedArticles.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No saved stories yet.</Text>
                    <Text style={styles.emptyText}>
                      Tap Save on any story and it will appear here.
                    </Text>
                  </View>
                )}
              </View>
            }
            contentContainerStyle={styles.contentContainer}
            data={activeTab === 'saved' ? savedArticles : briefingArticles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <BriefingRow
                article={item}
                isSaved={savedIds.includes(item.id)}
                onPress={() => openArticle(item)}
                onToggleSaved={() => toggleSaved(item.id)}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={palette.accent} />
            }
            showsVerticalScrollIndicator={false}
          />
        </LinearGradient>

        <Modal visible={!!selectedArticle} animationType="slide" onRequestClose={() => setSelectedArticle(null)}>
          <SafeAreaView style={styles.modalSafeArea}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedArticle && (
                <>
                  <Image source={{ uri: selectedArticle.imageUrl }} style={styles.modalHeroImage} />
                  <View style={styles.modalBody}>
                    <View style={styles.modalTopRow}>
                      <Text style={styles.modalKicker}>{selectedArticle.source}</Text>
                      <Pressable onPress={() => setSelectedArticle(null)}>
                        <Text style={styles.inlineAction}>Close</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.modalTitle}>{selectedArticle.title}</Text>
                    <Text style={styles.modalMeta}>
                      {selectedArticle.category} | {formatPublishedLabel(selectedArticle.publishedAt)}
                    </Text>
                    <Text style={styles.modalSummary}>{selectedArticle.description}</Text>
                    <View style={styles.modalActions}>
                      <Pressable
                        style={styles.primaryAction}
                        onPress={() => toggleSaved(selectedArticle.id)}
                      >
                        <Text style={styles.primaryActionText}>
                          {savedIds.includes(selectedArticle.id) ? 'Remove Bookmark' : 'Save Story'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryAction}
                        onPress={() => Linking.openURL(selectedArticle.url)}
                      >
                        <Text style={styles.secondaryActionText}>Open Source</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.shell,
  },
  background: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  heroSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 6,
    backgroundColor: 'rgba(255, 252, 248, 0.72)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: palette.accent,
  },
  tabText: {
    color: palette.secondaryText,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  tabTextActive: {
    color: palette.accentContrast,
  },
  eyebrow: {
    color: palette.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headline: {
    ...typography.display,
    color: palette.text,
    maxWidth: 260,
  },
  sourceChip: {
    color: palette.text,
    backgroundColor: palette.card,
    borderColor: palette.cardBorder,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: 'hidden',
    fontWeight: '600',
  },
  searchShell: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    paddingHorizontal: spacing.md,
    ...shadows.soft,
  },
  searchInput: {
    paddingVertical: spacing.md,
    color: palette.text,
    fontSize: 16,
  },
  debugBar: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 252, 248, 0.58)',
    borderWidth: 1,
    borderColor: palette.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  debugText: {
    color: palette.secondaryText,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    textTransform: 'capitalize',
  },
  debugDivider: {
    color: palette.muted,
    fontSize: 12,
  },
  categoryRail: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.66)',
  },
  categoryPillActive: {
    backgroundColor: palette.accent,
  },
  categoryText: {
    textTransform: 'capitalize',
    color: palette.text,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: palette.accentContrast,
  },
  loaderWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: spacing.sm,
  },
  loaderText: {
    color: palette.secondaryText,
  },
  featuredCard: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    minHeight: 360,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: palette.shell,
    ...shadows.large,
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  saveButton: {
    backgroundColor: 'rgba(248, 250, 252, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.28)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  badge: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  badgeDivider: {
    color: '#cbd5e1',
  },
  featuredTitle: {
    ...typography.heroTitle,
    color: '#ffffff',
    marginBottom: spacing.sm,
  },
  featuredSummary: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  featuredMeta: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: palette.text,
  },
  sectionMeta: {
    color: palette.secondaryText,
    fontWeight: '600',
  },
  listCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    flexDirection: 'row',
    gap: spacing.md,
    ...shadows.soft,
  },
  listTextWrap: {
    flex: 1,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listKicker: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: spacing.xs,
  },
  inlineAction: {
    color: palette.accent,
    fontWeight: '700',
  },
  listTitle: {
    ...typography.cardTitle,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  listSummary: {
    color: palette.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  listMeta: {
    color: palette.muted,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  listImage: {
    width: 104,
    height: 104,
    borderRadius: 18,
    backgroundColor: '#d6d3d1',
  },
  emptyState: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: 24,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.cardTitle,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: palette.secondaryText,
  },
  discoverPanel: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    ...shadows.soft,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: palette.secondaryText,
    fontWeight: '600',
  },
  sourceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sourcePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 252, 248, 0.72)',
    borderWidth: 1,
    borderColor: palette.cardBorder,
  },
  sourcePillText: {
    color: palette.text,
    fontWeight: '600',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: palette.shell,
  },
  modalContent: {
    paddingBottom: spacing.xxl,
  },
  modalHeroImage: {
    width: '100%',
    height: 320,
    backgroundColor: '#d6d3d1',
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalKicker: {
    color: palette.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  modalTitle: {
    ...typography.display,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  modalMeta: {
    color: palette.secondaryText,
    textTransform: 'capitalize',
    marginBottom: spacing.md,
  },
  modalSummary: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 26,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: palette.accent,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryActionText: {
    color: palette.accentContrast,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.cardBorder,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: palette.text,
    fontWeight: '700',
  },
});
