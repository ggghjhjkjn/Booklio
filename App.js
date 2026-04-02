import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

const LANGUAGES = [
  { label: 'English', value: 'english' },
  { label: 'Hindi', value: 'hindi' },
  { label: 'Hinglish', value: 'hinglish' },
];

const DURATIONS = [10, 20, 25, 30];
const WORDS_PER_MINUTE = 140;
const MAX_CUSTOM_MINUTES = 60;
const THEME_KEY = 'booklio_theme';

const palettes = {
  light: {
    bg: '#F4F6FA',
    card: '#FFFFFF',
    text: '#111827',
    textSecondary: '#4B5563',
    border: '#DDE3EE',
    accent: '#5D5FEF',
    accentSoft: '#ECECFF',
    shadow: 'rgba(27, 39, 82, 0.12)',
    highlight: '#C7D2FE',
  },
  dark: {
    bg: '#0B1020',
    card: '#121A2E',
    text: '#ECF0FF',
    textSecondary: '#AEB8D9',
    border: '#25314D',
    accent: '#8B9BFF',
    accentSoft: '#1B2552',
    shadow: 'rgba(0, 0, 0, 0.35)',
    highlight: '#334155',
  },
};

const createFillerParagraphs = (language) => {
  const fillerEnglish = [
    'To deepen understanding, connect each idea to everyday situations and ask why it matters in practice.',
    'A useful method is to summarize each section in one line, then explain it again in simpler words.',
    'When details feel complex, break them into steps, examples, and cause-and-effect patterns.',
  ];
  const fillerHindi = [
    'समझ को गहरा करने के लिए हर विचार को रोज़मर्रा के उदाहरण से जोड़ें और उसका महत्व स्पष्ट करें।',
    'हर हिस्से का छोटा सार बनाकर उसे आसान भाषा में दोबारा समझाना सीखने को मजबूत करता है।',
    'जब विषय कठिन लगे, उसे चरणों, उदाहरणों और कारण-परिणाम के रूप में बाँटें।',
  ];
  const fillerHinglish = [
    'Deep understanding ke liye har concept ko daily life example se connect karo aur why par focus karo.',
    'Har section ka one-line summary banao, phir usko simple language mein dobara explain karo.',
    'Agar topic tough lage, to usse steps, examples aur cause-effect flow mein tod do.',
  ];

  if (language === 'hindi') return fillerHindi;
  if (language === 'hinglish') return fillerHinglish;
  return fillerEnglish;
};

const generateExplanation = ({ inputText, language, minutes }) => {
  const targetWords = minutes * WORDS_PER_MINUTE;
  const safeInput = inputText.trim() || 'The provided topic';
  const fillerPool = createFillerParagraphs(language);

  const intro =
    language === 'hindi'
      ? `यह व्याख्या आपके दिए गए पाठ पर आधारित है: ${safeInput}. हम इसे स्पष्ट, संरचित और आसानी से याद रखने योग्य रूप में समझेंगे।`
      : language === 'hinglish'
        ? `Yeh explanation aapke input par based hai: ${safeInput}. Hum isko clear, structured aur easy-to-remember style mein samjhenge.`
        : `This explanation is based on your input: ${safeInput}. We will break it down in a clear, structured, and memorable way.`;

  const sections = [
    language === 'hindi'
      ? '1) मूल विचार: यह भाग मुख्य अवधारणा और उसके उद्देश्य को सरल भाषा में स्पष्ट करता है।'
      : language === 'hinglish'
        ? '1) Core idea: Is part mein main concept aur uska purpose simple words mein clear hota hai.'
        : '1) Core idea: This section explains the central concept and why it matters.',
    language === 'hindi'
      ? '2) तर्क और प्रवाह: अब हम समझते हैं कि यह विचार कैसे विकसित होता है और किन बिंदुओं से जुड़ता है।'
      : language === 'hinglish'
        ? '2) Logic and flow: Ab dekhte hain concept ka progression kaise hota hai aur key points kaise connected hain.'
        : '2) Logic and flow: Next, we map how the idea develops and connects to key points.',
    language === 'hindi'
      ? '3) उदाहरण: वास्तविक और व्यावहारिक उदाहरण जटिल भागों को तुरंत समझने में मदद करते हैं।'
      : language === 'hinglish'
        ? '3) Examples: Real-life examples se difficult parts instantly relatable ho jaate hain.'
        : '3) Examples: Practical examples make abstract parts easier to understand.',
    language === 'hindi'
      ? '4) पुनरावृत्ति: अंत में मुख्य बिंदुओं को दोहराकर याददाश्त मजबूत की जाती है।'
      : language === 'hinglish'
        ? '4) Recap: End mein key points revise karke retention strong banaya jata hai.'
        : '4) Recap: Finally, we reinforce memory through a focused summary.',
  ];

  const words = `${intro} ${sections.join(' ')}`.split(/\s+/).filter(Boolean);

  let cursor = 0;
  while (words.length < targetWords) {
    const sentence = fillerPool[cursor % fillerPool.length];
    words.push(...sentence.split(/\s+/).filter(Boolean));
    cursor += 1;
  }

  return {
    text: words.slice(0, targetWords).join(' '),
    targetWords,
  };
};

const pickVoice = async (genderHint, languageValue) => {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const langCode = languageValue === 'hindi' ? 'hi' : 'en';
    const filtered = voices.filter((voice) => (voice.language || '').toLowerCase().startsWith(langCode));
    const byGenderName = filtered.find((voice) =>
      genderHint === 'female'
        ? /female|woman|feminine|samantha|siri/i.test(voice.name)
        : /male|man|masculine|daniel|alex/i.test(voice.name)
    );

    return byGenderName?.identifier || filtered[0]?.identifier;
  } catch {
    return undefined;
  }
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState('english');
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [customDuration, setCustomDuration] = useState('');
  const [voiceGender, setVoiceGender] = useState('male');
  const [explanation, setExplanation] = useState('');
  const [targetWords, setTargetWords] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedWordCount, setHighlightedWordCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const scrollRef = useRef(null);
  const intervalRef = useRef(null);
  const activeSpeechRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const palette = palettes[theme];
  const words = useMemo(() => explanation.split(/\s+/).filter(Boolean), [explanation]);

  const effectiveMinutes =
    selectedDuration === 'custom'
      ? Math.min(MAX_CUSTOM_MINUTES, Math.max(1, Number(customDuration) || 0))
      : selectedDuration;

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      Speech.stop();
    };
  }, []);

  const startHighlightSimulation = () => {
    clearInterval(intervalRef.current);
    const msPerWord = 60000 / WORDS_PER_MINUTE;

    intervalRef.current = setInterval(() => {
      setElapsedMs((prev) => prev + msPerWord);
      setHighlightedWordCount((prev) => {
        if (prev >= words.length) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        if (next % 20 === 0) {
          scrollRef.current?.scrollTo({ y: Math.max(next * 1.3, 0), animated: true });
        }
        return next;
      });
    }, msPerWord);
  };

  const generate = async () => {
    const minutes = effectiveMinutes || 10;
    const { text, targetWords: count } = generateExplanation({
      inputText,
      language,
      minutes,
    });

    clearInterval(intervalRef.current);
    setIsPlaying(false);
    setElapsedMs(0);
    setHighlightedWordCount(0);
    setTargetWords(count);
    setExplanation(text);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 120,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  };

  const playAudio = async () => {
    if (!explanation) return;
    if (isPlaying) return;

    setIsPlaying(true);
    activeSpeechRef.current = true;
    startHighlightSimulation();

    const voiceId = await pickVoice(voiceGender, language);

    Speech.speak(explanation, {
      language: language === 'hindi' ? 'hi-IN' : 'en-US',
      pitch: voiceGender === 'female' ? 1.05 : 0.95,
      rate: 0.9,
      voice: voiceId,
      onDone: () => {
        activeSpeechRef.current = false;
        clearInterval(intervalRef.current);
        setIsPlaying(false);
      },
      onStopped: () => {
        activeSpeechRef.current = false;
      },
      onError: () => {
        activeSpeechRef.current = false;
      },
    });
  };

  const pauseAudio = async () => {
    if (!isPlaying) return;
    await Speech.stop();
    clearInterval(intervalRef.current);
    setIsPlaying(false);
  };

  const progress = words.length ? highlightedWordCount / words.length : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.headerRow}>
        <Text style={[styles.brand, { color: palette.text }]}>Booklio</Text>
        <View style={styles.modeRow}>
          <Text style={[styles.modeText, { color: palette.textSecondary }]}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>
          <Switch
            value={theme === 'dark'}
            onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
            trackColor={{ false: '#B7C2DB', true: palette.accent }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <Text style={[styles.label, { color: palette.textSecondary }]}>Input</Text>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Paste your text here…"
            placeholderTextColor={palette.textSecondary}
            multiline
            style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
          />

          <Text style={[styles.label, { color: palette.textSecondary }]}>Language</Text>
          <View style={styles.rowWrap}>
            {LANGUAGES.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setLanguage(option.value)}
                style={[
                  styles.chip,
                  {
                    borderColor: language === option.value ? palette.accent : palette.border,
                    backgroundColor: language === option.value ? palette.accentSoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: palette.text }}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: palette.textSecondary }]}>Duration</Text>
          <View style={styles.rowWrap}>
            {DURATIONS.map((min) => (
              <Pressable
                key={min}
                onPress={() => setSelectedDuration(min)}
                style={[
                  styles.chip,
                  {
                    borderColor: selectedDuration === min ? palette.accent : palette.border,
                    backgroundColor: selectedDuration === min ? palette.accentSoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: palette.text }}>{min} min</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setSelectedDuration('custom')}
              style={[
                styles.chip,
                {
                  borderColor: selectedDuration === 'custom' ? palette.accent : palette.border,
                  backgroundColor: selectedDuration === 'custom' ? palette.accentSoft : 'transparent',
                },
              ]}
            >
              <Text style={{ color: palette.text }}>Custom</Text>
            </Pressable>
          </View>

          {selectedDuration === 'custom' && (
            <TextInput
              value={customDuration}
              onChangeText={setCustomDuration}
              placeholder="Enter minutes (1-60)"
              placeholderTextColor={palette.textSecondary}
              keyboardType="numeric"
              style={[styles.customInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.bg }]}
            />
          )}

          <Text style={[styles.meta, { color: palette.textSecondary }]}>Target words: {effectiveMinutes * WORDS_PER_MINUTE}</Text>

          <Text style={[styles.label, { color: palette.textSecondary }]}>Voice</Text>
          <View style={styles.rowWrap}>
            {[
              { label: 'Soft Male', value: 'male' },
              { label: 'Soft Female', value: 'female' },
            ].map((voice) => (
              <Pressable
                key={voice.value}
                onPress={() => setVoiceGender(voice.value)}
                style={[
                  styles.chip,
                  {
                    borderColor: voiceGender === voice.value ? palette.accent : palette.border,
                    backgroundColor: voiceGender === voice.value ? palette.accentSoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: palette.text }}>{voice.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={[styles.generateBtn, { backgroundColor: palette.accent }]} onPress={generate}>
            <Text style={styles.generateText}>Generate</Text>
          </Pressable>
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              backgroundColor: palette.card,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text }]}>AI Explanation</Text>
          <Text style={[styles.meta, { color: palette.textSecondary }]}>Generated words: {targetWords || 0}</Text>
          <ScrollView ref={scrollRef} style={[styles.outputBox, { borderColor: palette.border, backgroundColor: palette.bg }]}> 
            <Text style={[styles.outputText, { color: palette.text }]}> 
              {words.length
                ? words.map((word, index) => (
                    <Text
                      key={`${word}-${index}`}
                      style={
                        index < highlightedWordCount
                          ? { backgroundColor: palette.highlight, color: palette.text }
                          : undefined
                      }
                    >
                      {word + ' '}
                    </Text>
                  ))
                : 'Your generated explanation will appear here.'}
            </Text>
          </ScrollView>

          <View style={styles.playerRow}>
            <Pressable style={[styles.playerBtn, { backgroundColor: palette.accent }]} onPress={playAudio}>
              <Text style={styles.playerBtnText}>Play</Text>
            </Pressable>
            <Pressable style={[styles.playerBtn, { backgroundColor: '#6B7280' }]} onPress={pauseAudio}>
              <Text style={styles.playerBtnText}>Pause</Text>
            </Pressable>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
            <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: palette.accent }]} />
          </View>
          <Text style={[styles.meta, { color: palette.textSecondary }]}>Progress: {Math.round(progress * 100)}% • Elapsed: {Math.round(elapsedMs / 1000)}s</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontSize: 28, fontWeight: '700', letterSpacing: 0.3 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeText: { fontSize: 12, fontWeight: '600' },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 110,
    textAlignVertical: 'top',
    padding: 12,
    fontSize: 15,
  },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customInput: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  meta: { marginTop: 8, fontSize: 12, fontWeight: '500' },
  generateBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  outputBox: {
    marginTop: 8,
    maxHeight: 220,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  outputText: { fontSize: 15, lineHeight: 26 },
  playerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  playerBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  playerBtnText: { color: '#FFF', fontWeight: '700' },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: { height: '100%' },
});
