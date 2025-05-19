import InputField from "@/components/InputField";
import { colors } from "@/constants/colors";
import { Link, router } from "expo-router";
import { useContext, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../../src/context/AuthContext";
import { fonts } from "@/constants/fonts";
import * as Haptics from "expo-haptics";
import CustomButton from "@/components/CustomButton";
import { API_BASE_URL } from "@/constants/address";

const Login = () => {
  const auth = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (username === "" || password === "") {
      Alert.alert("Ошибка", "Заполнены не все поля");
      return;
    }
    try {
      const response = await fetch(API_BASE_URL + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          Alert.alert("Ошибка", errorData.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (response.status === 500) {
          Alert.alert("Ошибка сервера", "Попробуйте позже.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Alert.alert("Ошибка", errorData.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }

      const data = await response.json();
      if (auth) {
        auth.login(data.access_token, data.refresh_token);
        router.replace("../(root)/(tabs)/home");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "position"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
            contentContainerStyle={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
          >
            <Text style={styles.title}>Добро пожаловать! 👋</Text>
            <View style={styles.form}>
              <View style={styles.form__element}>
                <InputField
                  value={username}
                  placeholder="Имя пользователя"
                  isIncorrect={error !== ""}
                  secureTextEntry={false}
                  onChangeText={(text) => setUsername(text)}
                />
              </View>
              <View style={styles.form__element}>
                <InputField
                  value={password}
                  placeholder="Пароль"
                  isIncorrect={error !== ""}
                  secureTextEntry={true}
                  onChangeText={(text) => setPassword(text)}
                />
              </View>
            </View>
            <CustomButton
              onPress={handleLogin}
              title="Войти"
              type={"action"}
              fill={"solid"}
            />
            <View style={styles.registration}>
              <Text style={styles.registration__title}>
                Нет аккаунта?{" "}
                <Link
                  href="../(auth)/registration"
                  style={styles.registration__link}
                >
                  <Text>Зарегистрироваться</Text>
                </Link>
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 24,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: colors.black,
    fontFamily: fonts.Unbounded,
  },
  form: {
    marginTop: 24,
  },
  registration: {
    marginTop: 16,
    width: "100%",
    display: "flex",
    alignItems: "center",
  },
  registration__title: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: 400,
    fontFamily: fonts.Montserrat,
  },
  registration__link: {
    color: colors.primary,
    fontWeight: 600,
  },
  form__element: {
    marginBottom: 16,
  },
});

export default Login;
