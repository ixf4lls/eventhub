import {
  View,
  Text,
  Button,
  Platform,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fonts } from "@/constants/fonts";
import { colors } from "@/constants/colors";
import * as Haptics from "expo-haptics";
import CustomButton from "@/components/CustomButton";
import { API_BASE_URL } from "@/constants/address";
import { useEffect, useState } from "react";
import { fetchWithToken } from "@/utils/tokenInterceptor";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import ParticipantCard from "@/components/ParticipantCard";

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
  organization_id: number;
};

type EventResponse = {
  event: Event;
  is_joined: boolean;
  is_creator: boolean;
};

type Participant = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
};

const formatDate = (date: string) => {
  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, "d MMMM", {
    locale: ru,
  }).toUpperCase();

  return formattedDate;
};

const formatTime = (time: string) => {
  if (!time) return "00:00";
  return time.slice(0, 5);
};

const ModalScreen = () => {
  const router = useRouter();

  const [event, setEvent] = useState<Event>({
    id: 0,
    title: "",
    description: "",
    category: "",
    is_public: false,
    status: "",
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    creator_id: 0,
    organization_id: 0,
  });

  const [userJoined, setUserJoined] = useState<boolean>(false);
  const [isCreator, setIsCreator] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [creator, setCreator] = useState<Participant>({
    id: 0,
    username: "",
    first_name: "",
    last_name: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { id, isCompleted } = useLocalSearchParams();

  const LoadData = async (id: number) => {
    try {
      setIsLoading(true);
      const response = (await fetchWithToken(
        API_BASE_URL + "/api/events/" + id,
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

      const data = (await response.json()) as EventResponse;
      setEvent(data.event);
      setUserJoined(data.is_joined);
      setIsCreator(data.is_creator);

      // Now we have the event data, we can load the creator
      if (data.event.creator_id) {
        await LoadCreatorData(data.event.creator_id);
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const JoinEvent = async (event_id: number) => {
    try {
      const response = (await fetchWithToken(
        API_BASE_URL + "/api/events/" + event_id + "/join",
        {
          method: "POST",
        },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUserJoined(true);
      LoadParticipants(event_id);
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const QuitEvent = async (event_id: number) => {
    try {
      const response = (await fetchWithToken(
        API_BASE_URL + "/api/events/" + event_id + "/quit",
        {
          method: "DELETE",
        },
      )) as Response;

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUserJoined(false);
      LoadParticipants(event_id);
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleQuitEvent = (event_id: number) => {
    Alert.alert("Вы уверены, что хотите отменить участие?", "", [
      {
        text: "Нет, оставить все как есть",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Да, отменить",
        onPress: () => QuitEvent(event_id),
        style: "destructive",
      },
    ]);
  };

  const handleDeleteEvent = (event_id: number) => {
    Alert.alert("Вы уверены, что хотите удалить это мероприятие", "", [
      {
        text: "Нет, оставить все как есть",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Да, удалить",
        onPress: () => DeleteEvent(event_id),
        style: "destructive",
      },
    ]);
  };

  const DeleteEvent = async (event_id: number) => {
    try {
      const response = (await fetchWithToken(
        API_BASE_URL + "/api/events/" + event_id + "/delete",
        {
          method: "DELETE",
        },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Мероприятие успешно удалено.");
      router.back();
      router.replace("/(root)/(tabs)/home");
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение." + error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const LoadParticipants = async (eventId: number) => {
    if (!eventId) return;

    try {
      const response = (await fetchWithToken(
        `${API_BASE_URL}/api/events/${eventId}/participants`,
        { method: "GET" },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      const data = await response.json();
      setParticipants(data.participants);
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const LoadCreatorData = async (userId: number) => {
    if (!userId || userId === 0) return;

    try {
      const response = (await fetchWithToken(
        `${API_BASE_URL}/api/users/${userId}`,
        { method: "GET" },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      const data = await response.json();
      setCreator(data.user);
    } catch (error) {
      console.error("Error loading creator data:", error);
      Alert.alert(
        "Ошибка загрузки данных организатора",
        "Проверьте подключение.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const refreshData = () => {
    const eventId = Number(id);
    if (eventId) {
      LoadData(eventId);
      LoadParticipants(eventId);
    }
  };

  useEffect(() => {
    const eventId = Number(id);
    if (eventId) {
      refreshData();
    }

    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, [id]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.close}>
        <Image
          source={require("../assets/icons/close.png")}
          style={{ height: 16, width: 16 }}
        />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        <Image
          source={require("../assets/images/blank_image_modal.png")}
          style={styles.headerImage}
        />

        <View style={styles.content}>
          <View style={styles.tags}>
            {isCompleted == "false" ? (
              isCreator ? (
                <View style={styles.creator}>
                  <Text style={styles.creator__text}>ВЫ СОЗДАТЕЛЬ</Text>
                </View>
              ) : userJoined ? (
                <View style={styles.join}>
                  <Text style={styles.join__text}>ВЫ УЧАСТВУЕТЕ</Text>
                </View>
              ) : null
            ) : null}

            <View style={styles.public}>
              <Text style={styles.public__text}>
                {event?.is_public ? "ОТКРЫТОЕ" : "ДЛЯ ОРГАНИЗАЦИИ"}
              </Text>
            </View>
          </View>

          <View style={styles.mainText}>
            <Text style={styles.title}>{event?.title}</Text>
            <Text style={styles.category}>{event?.category}</Text>
            <Text style={styles.description}>{event?.description}</Text>
          </View>

          <View style={styles.date}>
            <View style={styles.date__item}>
              <Text style={styles.item__text}>
                {event?.date ? formatDate(event.date) : ""}
              </Text>
            </View>
            <View style={styles.date__item}>
              <Text style={styles.item__text}>
                {event?.start_time ? formatTime(event?.start_time) : ""} -{" "}
                {event?.end_time ? formatTime(event?.end_time) : ""}
              </Text>
            </View>
          </View>

          <View style={styles.location}>
            <Image
              source={require("../assets/icons/location.png")}
              style={{ height: 18, width: 14 }}
            />
            <Text style={styles.location__text}>{event?.location}</Text>
          </View>
        </View>

        {/* Дополнительная информация */}
        <View style={styles.additionalInfo}>
          <Text style={styles.sectionTitle}>Организатор</Text>
          {isLoading ? (
            <Text style={styles.loadingText}>Загрузка данных...</Text>
          ) : creator?.username ? (
            <ParticipantCard
              username={creator.username}
              first_name={creator.first_name}
              last_name={creator.last_name}
            />
          ) : (
            <Text style={styles.noParticipants}>
              Информация об организаторе недоступна
            </Text>
          )}
        </View>

        {/* Участники мероприятия */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>Участники</Text>
          {isLoading ? (
            <Text style={styles.loadingText}>Загрузка данных...</Text>
          ) : participants && participants.length > 0 ? (
            participants.map((participant, index) => (
              <View style={styles.participant} key={index}>
                <ParticipantCard
                  username={participant.username}
                  first_name={participant.first_name}
                  last_name={participant.last_name}
                />
              </View>
            ))
          ) : (
            <Text style={styles.noParticipants}>Пока нет участников</Text>
          )}
        </View>
      </ScrollView>

      {/* Нижние кнопки */}
      {isCompleted == "false" ? (
        isCreator ? (
          <View style={styles.edit_buttons}>
            <View style={{ flexGrow: 3 }}>
              <CustomButton
                onPress={() => {
                  if (!event) return;
                  router.push({
                    pathname: "/event_edit_modal",
                    params: {
                      org_id: event.organization_id,
                      event_id: event.id,
                    },
                  });
                }}
                title="Изменить данные"
                type={"action"}
                fill={"bordered"}
              />
            </View>
            <View style={{ flexGrow: 1 }}>
              <CustomButton
                onPress={() => handleDeleteEvent(event?.id || 0)}
                title="Удалить"
                type={"cancel"}
                fill={"bordered"}
              />
            </View>
          </View>
        ) : (
          <View style={styles.button}>
            {userJoined ? (
              <CustomButton
                onPress={() => handleQuitEvent(Number(id))}
                title="Отменить участие"
                type={"cancel"}
                fill={"bordered"}
              />
            ) : (
              <CustomButton
                onPress={() => JoinEvent(Number(id))}
                title="Я иду!"
                type={"action"}
                fill={"solid"}
              />
            )}
          </View>
        )
      ) : (
        <View style={styles.completed}>
          <Text style={styles.completed__text}>Мероприятие завершено</Text>
        </View>
      )}

      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  headerImage: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  close: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 5,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
    padding: 8,
  },
  content: {
    backgroundColor: "#ffffff",
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  tags: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  join: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderColor: colors.success,
    borderWidth: 1,
    width: "auto",
  },
  join__text: {
    fontFamily: fonts.Unbounded,
    color: colors.success,
    fontWeight: 600,
    fontSize: 8,
    textTransform: "uppercase",
  },
  public: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  public__text: {
    fontFamily: fonts.Unbounded,
    color: colors.primary,
    fontWeight: 600,
    fontSize: 8,
    textTransform: "uppercase",
  },
  creator: {
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#CA3CFF",
    justifyContent: "center",
    alignItems: "center",
    width: "auto",
  },
  creator__text: {
    fontFamily: fonts.Unbounded,
    color: "#ffffff",
    fontWeight: 600,
    fontSize: 8,
    textTransform: "uppercase",
  },
  loadingText: {
    fontFamily: fonts.Montserrat,
    fontSize: 14,
    color: colors.grey_text,
    fontStyle: "italic",
    marginTop: 4,
  },
  mainText: {
    marginBottom: 20,
  },
  title: {
    marginTop: 8,
    color: colors.black,
    fontFamily: fonts.Unbounded,
    fontWeight: 800,
    fontSize: 20,
  },
  category: {
    color: colors.secondary,
    fontFamily: fonts.Montserrat,
    fontWeight: 600,
    fontSize: 12,
    marginTop: 2,
  },
  description: {
    color: colors.secondary,
    fontFamily: fonts.Montserrat,
    fontWeight: 400,
    fontSize: 12,
    marginTop: 16,
    minHeight: 100,
  },
  date: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  date__item: {
    borderRadius: 6,
    backgroundColor: colors.primary,
    display: "flex",
    justifyContent: "center",
    alignContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  item__text: {
    fontFamily: fonts.Unbounded,
    fontWeight: 600,
    fontSize: 10,
    color: "#ffffff",
  },
  location: {
    marginTop: 8,
    display: "flex",
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  location__text: {
    fontFamily: fonts.Montserrat,
    fontWeight: 500,
    fontSize: 12,
    color: colors.secondary,
  },
  participantsSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontFamily: fonts.Unbounded,
    fontWeight: 600,
    fontSize: 14,
    color: colors.black,
    marginBottom: 8,
  },
  participant: {
    paddingVertical: 8,
  },
  participantName: {
    fontFamily: fonts.Montserrat,
    fontSize: 14,
    color: colors.secondary,
  },
  noParticipants: {
    fontFamily: fonts.Montserrat,
    fontSize: 14,
    color: colors.grey_text,
    fontStyle: "italic",
  },
  additionalInfo: {
    paddingHorizontal: 24,
    marginTop: 20,
    borderBottomColor: "#EEEEEE",
  },
  infoText: {
    fontFamily: fonts.Montserrat,
    fontSize: 12,
    color: colors.grey_text,
  },
  button: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  edit_buttons: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    gap: 8,
  },
  completed: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    height: 48,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  completed__text: {
    fontFamily: fonts.Unbounded,
    fontSize: 12,
    fontWeight: 600,
    color: colors.grey_text,
  },
});

export default ModalScreen;
