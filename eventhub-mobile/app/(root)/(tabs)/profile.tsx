import * as Haptics from "expo-haptics";
import { API_BASE_URL } from "@/constants/address";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchWithToken } from "@/utils/tokenInterceptor";
import { fonts } from "@/constants/fonts";
import { colors } from "@/constants/colors";
import CustomButton from "@/components/CustomButton";

type User = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
};

const Profile = () => {
  const [user, setUser] = useState<User>({
    id: 0,
    username: "",
    first_name: "",
    last_name: "",
  });

  const LoadUserData = async () => {
    try {
      const response = (await fetchWithToken(
        `${API_BASE_URL}/api/users/profile`,
        { method: "GET" },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      Alert.alert(
        "Ошибка загрузки данных пользователя",
        "Проверьте подключение.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  useEffect(() => {
    LoadUserData();

    const interval = setInterval(() => {
      LoadUserData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.header__text}>Профиль</Text>
      </View>
      <View style={styles.content}>
        <View>
          <Text style={styles.name}>{user.first_name}</Text>
          <Text style={styles.name}>{user.last_name}</Text>
          <Text style={styles.username}>@{user.username}</Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <CustomButton
          onPress={() => {
            Alert.alert("Выход из аккаунта", "Вы действительно хотите выйти?", [
              {
                text: "Отмена",
                style: "cancel",
              },
              {
                text: "Выйти",
                onPress: () => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                  AsyncStorage.removeItem("token");
                  router.replace("/(auth)/login");
                },
                style: "destructive",
              },
            ]);
          }}
          title="Выйти"
          type="cancel"
          fill="bordered"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    display: "flex",
  },
  header: {
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  name: {
    fontFamily: fonts.Unbounded,
    color: colors.black,
    textTransform: "uppercase",
    fontWeight: 800,
    fontSize: 24,
  },
  username: {
    marginTop: 8,
    fontFamily: fonts.Unbounded,
    fontWeight: 600,
    fontSize: 16,
    color: "#71727A",
  },
  buttonContainer: {
    paddingHorizontal: 16,
  },
});

export default Profile;
