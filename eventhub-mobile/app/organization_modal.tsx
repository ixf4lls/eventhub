import { API_BASE_URL } from "@/constants/address";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { fetchWithToken } from "@/utils/tokenInterceptor";
import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import EmptySpace from "@/components/EmptyState";
import * as Clipboard from "expo-clipboard";
import CustomButton from "@/components/CustomButton";
import RenderCategory from "@/components/RenderCategory";

type Organization = {
  id: number;
  founder_id: number;
  name: string;
  invite_code: string;
};

type Event = {
  id: number;
  title: string;
  description: string;
  category: string;
  is_public: boolean;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  creator_id: number;
};

type Member = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
};

const ModalScreen = () => {
  const router = useRouter();

  const { id } = useLocalSearchParams();

  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  const [organization, setOrganization] = useState<Organization>();
  const [isCreator, setIsCreator] = useState(false);
  const [members, setMembers] = useState<Member[]>();

  const [isCodeClicked, setIsCodeClicked] = useState(false);

  const LoadData = async () => {
    try {
      const response = (await fetchWithToken(
        API_BASE_URL + "/api/organizations/" + id,
        {
          method: "GET",
        },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      const data = await response.json();
      setOrganization(data.organization);
      setIsCreator(data.is_creator);
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRefreshing(false);
    }
  };

  const LoadOrganizationEvents = async () => {
    setRefreshing(true);
    try {
      const response = (await fetchWithToken(
        API_BASE_URL + "/api/organizations/" + id + "/events",
        {
          method: "GET",
        },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      const data = await response.json();
      setActiveEvents(data.active);
      setCompletedEvents(data.completed);
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRefreshing(false);
    }
  };

  const LoadMembers = async () => {
    setRefreshing(true);
    try {
      const response = (await fetchWithToken(
        API_BASE_URL + "/api/organizations/" + id + "/members",
        {
          method: "GET",
        },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      const data = await response.json();
      setMembers(data.members);
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderMembers = () => {
    if (!members) return null;
    return (
      <View style={styles.members__list}>
        {members.map((member) => {
          return (
            <View key={member.id} style={styles.member}>
              <Text style={styles.member__name}>
                {member.first_name} {member.last_name}
              </Text>
              <Text style={styles.member__username}>@{member.username}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const handleCodeClick = () => {
    setIsCodeClicked(true);
    handleCopy();
    setTimeout(() => {
      setIsCodeClicked(false);
    }, 2000);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(organization?.invite_code || "no_code");
    Alert.alert("Скопировано!", "Код приглашения скопирован в буфер обмена.");
  };

  useEffect(() => {
    LoadOrganizationEvents();
    LoadData();
    LoadMembers();
    const interval = setInterval(() => {
      LoadOrganizationEvents();
      LoadData();
      LoadMembers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ zIndex: 5 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require("../assets/icons/back.png")}
            style={{ width: 16, height: 16, marginLeft: 24 }}
          />
        </TouchableOpacity>
        <Text style={styles.header__title}>{organization?.name}</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              LoadOrganizationEvents();
              LoadData();
              LoadMembers();
            }}
          />
        }
        style={{ height: "100%" }}
      >
        {isCreator ? (
          <View style={styles.invite}>
            <Text style={styles.invite__title}>Код приглашения</Text>
            <Pressable onPress={handleCodeClick} style={styles.code}>
              <Text style={styles.code__text}>{organization?.invite_code}</Text>
              <Image
                source={require("../assets/icons/copy.png")}
                style={{ width: 14, height: 14 }}
              />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.categories}>
          <Text style={styles.title}>Мероприятия</Text>
          {isCreator ? (
            <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
              <CustomButton
                onPress={() =>
                  router.push({
                    pathname: "/event_creation_modal",
                    params: {
                      org_id: id,
                    },
                  })
                }
                title="Создать новое"
                type="action"
                fill="bordered"
              />
            </View>
          ) : null}
          {RenderCategory({
            events: activeEvents,
            title: "Актуальные",
            emptyMessage: "Мероприятий пока нет",
            emptyInfo: "Здесь будут все актуальные мероприятия организации",
            isCompleted: false,
          })}

          {RenderCategory({
            events: completedEvents,
            title: "Завершенные",
            emptyMessage: "",
            emptyInfo: "",
            isCompleted: true,
          })}
        </View>

        <View style={styles.members}>
          <Text style={styles.members__title}>Участники</Text>
          {members && members.length != 0 ? (
            renderMembers()
          ) : (
            <EmptySpace
              message="В этой организации пока нет участников"
              info="Вы можете пригласить пользователей, отправив им пригласительный код"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
  },
  header: {
    width: "100%",
    marginTop: 8,
    marginBottom: 16,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  header__title: {
    fontFamily: fonts.Unbounded,
    color: colors.black,
    fontSize: 14,
    fontWeight: 600,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  invite: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  invite__title: {
    fontFamily: fonts.Unbounded,
    fontWeight: 600,
    fontSize: 14,
    color: colors.grey_text,
  },
  code: {
    padding: 12,
    borderRadius: 12,
    borderColor: colors.primary,
    borderWidth: 2,
    display: "flex",
    flexDirection: "row",
    gap: 8,
  },
  code__text: {
    fontFamily: fonts.Unbounded,
    fontWeight: 500,
    fontSize: 12,
    color: colors.primary,
  },
  title: {
    fontFamily: fonts.Unbounded,
    fontWeight: 800,
    fontSize: 16,
    color: colors.black,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  categories: {
    width: "100%",
    marginTop: 24,
  },
  category: {},
  category__title: {
    color: colors.grey_text,
    fontFamily: fonts.Unbounded,
    fontSize: 14,
    fontWeight: 500,
    marginLeft: 16,
    marginBottom: 8,
  },
  category__content: {
    paddingLeft: 16,
    gap: 8,
  },
  category__item: {
    marginRight: 12,
  },
  members: {
    marginHorizontal: 16,
    marginBottom: 48,
  },
  members__title: {
    fontFamily: fonts.Unbounded,
    fontWeight: 800,
    fontSize: 16,
    color: colors.black,
    marginBottom: 16,
  },
  members__list: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  member: {
    backgroundColor: "#F8F9FE",
    borderRadius: 16,
    padding: 16,
  },
  member__name: {
    fontFamily: fonts.Montserrat,
    fontWeight: 700,
    fontSize: 14,
    color: colors.black,
    marginBottom: 4,
  },
  member__username: {
    fontFamily: fonts.Montserrat,
    fontWeight: 600,
    fontSize: 12,
    color: colors.grey_text,
  },
});

export default ModalScreen;
