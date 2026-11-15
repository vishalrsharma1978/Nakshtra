import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabsParamList = {
  Home: undefined;
  Questions: undefined;
  Consult: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  Kundli: undefined;
  NewQuestion: undefined;
  QuestionDetail: { questionId: string };
  ExpertDetail: { expertId: string };
  Payment: { purpose: 'question_fast_track' | 'consultation'; refId: string };
  VideoCall: { room: string; title?: string };
};
