import EmptyState from "@/components/EmptyState";
import NotificationCard from "@/components/Notification";
import { API_BASE_URL } from "@/constants/address";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { fetchWithToken } from "@/utils/tokenInterceptor";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationData = {
  id: number;
  message: string;
  info: string;
  created_at: string;
};

const Notifications = () => {
  const [refreshing, setRefreshing] = useState(false);

  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const LoadNotifications = async () => {
    setRefreshing(true);

    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }

      const response = (await fetchWithToken(
        API_BASE_URL + "/api/notifications",
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
      setNotifications(data.notifications);
    } catch (error) {
      console.error("Ошибка запроса:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    LoadNotifications();

    const interval = setInterval(() => {
      LoadNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const sortedNotifications =
    notifications == null
      ? []
      : notifications.sort((a, b) => {
          const dateA = new Date(a.created_at.split(" +")[0]);
          const dateB = new Date(b.created_at.split(" +")[0]);

          return dateB.getTime() - dateA.getTime();
        });

  return (
    <SafeAreaView style={{ backgroundColor: "#ffffff", height: "100%" }}>
      <View style={styles.header}>
        <Text style={styles.header__text}>Уведомления</Text>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={LoadNotifications}
          />
        }
      >
        <View style={styles.notifications}>
          {notifications != null ? (
            sortedNotifications.map((notification) => {
              return (
                <View key={notification.id}>
                  <NotificationCard
                    message={notification.message}
                    info={notification.info}
                    createdAt={notification.created_at}
                  />
                </View>
              );
            })
          ) : (
            <EmptyState
              message="Уведомлений пока нет"
              info="Мы сообщим, если что-то изменится в мероприятии, на которое вы записаны"
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    display: "flex",
    position: "fixed",
    width: "100%",
    marginTop: 8,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  header__text: {
    fontFamily: fonts.Unbounded,
    color: colors.black,
    fontWeight: 600,
    fontSize: 16,
  },
  notifications: {
    marginHorizontal: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
});

export default Notifications;
