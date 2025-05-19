import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import TextArea from "@/components/TextArea";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  View,
  TextInput,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { fetchWithToken } from "@/utils/tokenInterceptor";
import { API_BASE_URL } from "@/constants/address";
import * as Haptics from "expo-haptics";

type TempEvent = {
  is_public: boolean;
  title: string;
  category: string;
  description: string;
  date: Date | null;
  start_time: Date | null;
  end_time: Date | null;
  location: string;
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
  organization_id: number;
};

type EventResponse = {
  event: Event;
  is_joined: boolean;
  is_creator: boolean;
};

const formatDate = (date: Date | null) => {
  if (!date) return "Выбрать дату";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  });
};

const formatTime = (date: Date | null) => {
  if (!date) return "Выбрать время";
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
};

const ModalScreen = () => {
  const { org_id, event_id } = useLocalSearchParams();

  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tempEvent, setTempEvent] = useState<TempEvent>({
    is_public: true,
    title: "",
    category: "",
    description: "",
    date: null,
    start_time: null,
    end_time: null,
    location: "",
  });

  const stepNames = [
    "Основная информация",
    "Описание",
    "Дата и время",
    "Локация",
    "Предпросмотр",
  ];

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const validateStep1 = () => {
    if (!tempEvent.title || !tempEvent.category) {
      Alert.alert(
        "Не все поля заполнены",
        "Пожалуйста, заполните название и категорию мероприятия",
      );
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!tempEvent.description) {
      Alert.alert(
        "Не все поля заполнены",
        "Пожалуйста, заполните описание мероприятия",
      );
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!tempEvent.date || !tempEvent.start_time || !tempEvent.end_time) {
      Alert.alert(
        "Не все поля заполнены",
        "Пожалуйста, выберите дату, время начала и время окончания мероприятия",
      );
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!tempEvent.location) {
      Alert.alert(
        "Не все поля заполнены",
        "Пожалуйста, укажите место проведения мероприятия",
      );
      return false;
    }
    return true;
  };

  const handleNext = () => {
    let isValid = true;
    switch (activeIndex) {
      case 0:
        isValid = validateStep1();
        break;
      case 1:
        isValid = validateStep2();
        break;
      case 2:
        isValid = validateStep3();
        break;
      case 3:
        isValid = validateStep4();
        break;
    }

    if (isValid) {
      swiperRef.current?.scrollBy(1);
    }
  };

  const LoadData = async (id: number) => {
    try {
      const response = (await fetchWithToken(
        `${API_BASE_URL}/api/events/${id}`,
        { method: "GET" },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) router.replace("/(auth)/login");
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      const { event } = (await response.json()) as EventResponse;

      const [year, month, day] = event.date.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);

      const parseTime = (timeStr: string) => {
        const [h, m, s] = timeStr.split(":").map(Number);
        return new Date(year, month - 1, day, h, m, s);
      };
      const startObj = parseTime(event.start_time);
      const endObj = parseTime(event.end_time);

      setTempEvent({
        is_public: event.is_public,
        title: event.title,
        category: event.category,
        description: event.description,
        date: dateObj,
        start_time: startObj,
        end_time: endObj,
        location: event.location,
      });
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  useEffect(() => {
    if (event_id) {
      LoadData(Number(event_id));
    }
  }, [event_id]);

  const updateEvent = async () => {
    try {
      const formattedDate = tempEvent.date
        ? tempEvent.date.toISOString()
        : null;
      const formattedStartTime = tempEvent.start_time
        ? tempEvent.start_time.toTimeString().split(" ")[0]
        : null;
      const formattedEndTime = tempEvent.end_time
        ? tempEvent.end_time.toTimeString().split(" ")[0]
        : null;

      const response = (await fetchWithToken(
        `${API_BASE_URL}/api/organizations/${org_id}/events/${event_id}/update`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: tempEvent.title,
            description: tempEvent.description,
            category: tempEvent.category,
            is_public: tempEvent.is_public,
            location: tempEvent.location,
            date: formattedDate,
            start_time: formattedStartTime,
            end_time: formattedEndTime,
          }),
        },
      )) as Response;

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/(auth)/login");
        }
        const errData = await response.json();
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      Alert.alert(
        "Успех! 🎉",
        "Мероприятие успешно изменено. Вы будете перенаправлены на главную.",
        [
          {
            text: "OK",
            onPress: () => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              router.back();
              router.back();
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert("Ошибка сервера", "Проверьте подключение." + error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.header__title}>Изменение мероприятия</Text>
        <Text style={styles.header__step}>
          Шаг {activeIndex + 1}. {stepNames[activeIndex]}
        </Text>
      </View>
      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination={false}
        onIndexChanged={(index) => setActiveIndex(index)}
        scrollEnabled={false}
      >
        <View style={styles.content}>
          <View style={styles.param}>
            <Text style={styles.param__hint}>Формат вашего события</Text>
            <View style={styles.param__content}>
              <View style={{ width: 278 }}>
                <Text style={styles.is_public__title}>
                  {tempEvent.is_public ? "Открытое" : "Закрытое"}
                </Text>
                <Text style={styles.is_public__info}>
                  {tempEvent.is_public
                    ? "Может присоединиться любой желающий"
                    : "Присоединиться могут только участники организации"}
                </Text>
              </View>
              <View
                style={{
                  height: 24,
                  width: 38,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Switch
                  value={!tempEvent.is_public}
                  onValueChange={() =>
                    setTempEvent({
                      ...tempEvent,
                      is_public: !tempEvent.is_public,
                    })
                  }
                  trackColor={{ false: "#D4D6DD", true: colors.primary }}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>
          </View>
          <View style={styles.param}>
            <Text style={styles.param__hint}>
              Дайте вашему событию запоминающееся имя. Например:
              «Техно-вечеринка 2025» или «Лекция по искусственному интеллекту»
            </Text>
            <View style={{ marginTop: 8 }}>
              <InputField
                value={tempEvent.title}
                onChangeText={(text) =>
                  setTempEvent({
                    ...tempEvent,
                    title: text,
                  })
                }
                placeholder="Введите название мероприятия"
              />
            </View>
          </View>
          <View style={styles.param}>
            <Text style={styles.param__hint}>
              Определите, к какой категории относится ваше событие
            </Text>
            <View style={{ marginTop: 8 }}>
              <InputField
                value={tempEvent.category}
                onChangeText={(text) =>
                  setTempEvent({
                    ...tempEvent,
                    category: text,
                  })
                }
                placeholder="Введите название категории"
              />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.param}>
            <Text style={styles.param__hint}>
              Расскажите, для кого мероприятие предназначено и что ждет
              участников: формат, особенности, чем мероприятие будет полезно или
              интересно.
            </Text>
            <View style={styles.param__content}>
              <TextArea
                value={tempEvent.description}
                onChangeText={(text) =>
                  setTempEvent({
                    ...tempEvent,
                    description: text,
                  })
                }
                placeholder="Введите описание мероприятия"
              />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.param}>
            <Text style={styles.param__hint}>
              Выберите день, когда состоится мероприятие.
            </Text>
            <View style={styles.param__content}>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={styles.date}
              >
                <Text style={styles.date__text}>
                  {formatDate(tempEvent.date)}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePickerModal
                  isVisible={showDatePicker}
                  mode="date"
                  onConfirm={(date) => {
                    setTempEvent({
                      ...tempEvent,
                      date: date,
                    });
                    setShowDatePicker(false);
                  }}
                  onCancel={() => setShowDatePicker(false)}
                  date={tempEvent.date || new Date()}
                  textColor={colors.black}
                  themeVariant="dark"
                />
              )}
            </View>
          </View>

          <View style={styles.param}>
            <Text style={styles.param__hint}>
              Укажите, во сколько начинается и заканчивается ваше событие.
            </Text>
            <View style={styles.param__content}>
              <View style={styles.time_container}>
                <Text style={styles.time__title}>Начало</Text>
                <Pressable
                  onPress={() => setShowStartTimePicker(true)}
                  style={styles.time}
                >
                  <Text style={styles.date__text}>
                    {formatTime(tempEvent.start_time)}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.time_container}>
                <Text style={styles.time__title}>Конец</Text>
                <Pressable
                  onPress={() => setShowEndTimePicker(true)}
                  style={styles.time}
                >
                  <Text style={styles.date__text}>
                    {formatTime(tempEvent.end_time)}
                  </Text>
                </Pressable>
              </View>

              {showStartTimePicker && (
                <DateTimePickerModal
                  isVisible={showStartTimePicker}
                  mode="time"
                  onConfirm={(time) => {
                    setTempEvent({
                      ...tempEvent,
                      start_time: time,
                    });
                    setShowStartTimePicker(false);
                  }}
                  onCancel={() => setShowStartTimePicker(false)}
                  date={tempEvent.start_time || new Date()}
                  textColor={colors.black}
                  themeVariant="dark"
                />
              )}

              {showEndTimePicker && (
                <DateTimePickerModal
                  isVisible={showEndTimePicker}
                  mode="time"
                  onConfirm={(time) => {
                    setTempEvent({
                      ...tempEvent,
                      end_time: time,
                    });
                    setShowEndTimePicker(false);
                  }}
                  onCancel={() => setShowEndTimePicker(false)}
                  date={tempEvent.end_time || new Date()}
                  textColor={colors.black}
                  themeVariant="dark"
                />
              )}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.param}>
            <Text style={styles.param__hint}>
              Где пройдет мероприятие? Укажите полный адрес или название
              заведения.
            </Text>
            <View style={styles.param__content}>
              <InputField
                value={tempEvent.location}
                onChangeText={(text) =>
                  setTempEvent({
                    ...tempEvent,
                    location: text,
                  })
                }
                placeholder="Введите адрес"
              />
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.preview__info}>
            Так будет выглядеть ваше мероприятие. Проверьте введенные данные.
            Если нужно что-то изменить, вернитесь на соответствующий шаг.
          </Text>
          <View style={styles.preview}>
            <View style={styles.tags}>
              <View style={styles.public}>
                <Text style={styles.public__text}>
                  {tempEvent.is_public ? "ОТКРЫТОЕ" : "ДЛЯ ОРГАНИЗАЦИИ"}
                </Text>
              </View>
            </View>
            <View style={styles.mainText}>
              <Text style={styles.title}>
                {tempEvent.title || "Название мероприятия"}
              </Text>
              <Text style={styles.category}>
                {tempEvent.category || "Категория"}
              </Text>
              <Text style={styles.description}>
                {tempEvent.description || "Описание мероприятия"}
              </Text>
            </View>

            <View style={styles.date_preview}>
              <View style={styles.date__item}>
                <Text style={styles.item__text}>
                  {tempEvent.date ? formatDate(tempEvent.date) : "Дата"}
                </Text>
              </View>
              <View style={styles.date__item}>
                <Text style={styles.item__text}>
                  {tempEvent.start_time
                    ? formatTime(tempEvent.start_time)
                    : "00:00"}{" "}
                  -{" "}
                  {tempEvent.end_time
                    ? formatTime(tempEvent.end_time)
                    : "00:00"}
                </Text>
              </View>
            </View>
            <View style={styles.location}>
              <Image
                source={require("../assets/icons/location.png")}
                style={{ height: 18, width: 14 }}
              />
              <Text style={styles.location__text}>
                {tempEvent.location || "Местоположение"}
              </Text>
            </View>
          </View>
        </View>
      </Swiper>
      <View style={styles.buttons}>
        <View style={{ flexGrow: 1 }}>
          <CustomButton
            title={activeIndex == 0 ? "Отмена" : "Назад"}
            onPress={() =>
              activeIndex == 0 ? router.back() : swiperRef.current?.scrollBy(-1)
            }
            type={"action"}
            fill={"bordered"}
          />
        </View>
        <View style={{ flexGrow: 6 }}>
          <CustomButton
            title={activeIndex == 4 ? "Изменить мероприятие" : "Далее"}
            onPress={activeIndex == 4 ? updateEvent : handleNext}
            type={"action"}
            fill={"solid"}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },
  header: {
    padding: 16,
  },
  header__title: {
    fontFamily: fonts.Unbounded,
    color: colors.grey_text,
    fontSize: 14,
    fontWeight: 600,
  },
  header__step: {
    fontFamily: fonts.Unbounded,
    fontWeight: 900,
    color: colors.black,
    fontSize: 16,
    marginTop: 4,
  },
  content: {
    marginHorizontal: 16,
    marginVertical: 8,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  buttons: {
    marginHorizontal: 16,
    display: "flex",
    flexDirection: "row",
    gap: 8,
  },
  param: {
    padding: 16,
    backgroundColor: "#F8F9FE",
    borderRadius: 16,
  },
  param__hint: {
    fontFamily: fonts.Montserrat,
    fontWeight: 600,
    color: colors.grey_text,
    fontSize: 12,
  },
  param__content: {
    marginTop: 8,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  is_public__title: {
    fontFamily: fonts.Unbounded,
    color: colors.black,
    fontSize: 14,
    fontWeight: 700,
  },
  is_public__info: {
    fontFamily: fonts.Montserrat,
    fontSize: 12,
    color: "#71727A",
    fontWeight: 400,
    marginTop: 4,
  },
  descriptionInput: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    marginTop: 4,
    padding: 12,
    fontFamily: fonts.Montserrat,
    fontSize: 12,
    color: "#8F9098",
    borderWidth: 1,
    borderColor: "#C5C6CC",
  },
  date: {
    padding: 12,
    borderColor: "#C5C6CC",
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  date__text: {
    fontFamily: fonts.Montserrat,
    fontSize: 14,
    fontWeight: 500,
    color: colors.grey_text,
  },
  time_container: {
    width: "50%",
  },
  time: {
    padding: 12,
    borderColor: "#C5C6CC",
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  time__title: {
    fontFamily: fonts.Unbounded,
    color: "#71727A",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 4,
    marginTop: 8,
  },
  tags: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
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
  mainText: {
    marginBottom: 16,
  },
  title: {
    color: colors.black,
    fontFamily: fonts.Unbounded,
    fontWeight: 800,
    fontSize: 20,
    marginBottom: 4,
  },
  category: {
    color: colors.secondary,
    fontFamily: fonts.Montserrat,
    fontWeight: 600,
    fontSize: 12,
    marginBottom: 16,
  },
  description: {
    color: colors.secondary,
    fontFamily: fonts.Montserrat,
    fontWeight: 400,
    fontSize: 12,
  },
  date_preview: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
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
    display: "flex",
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  location__text: {
    fontFamily: fonts.Montserrat,
    fontWeight: 500,
    fontSize: 12,
    color: colors.secondary,
  },
  preview__info: {
    fontFamily: fonts.Montserrat,
    fontSize: 12,
    fontWeight: 600,
    color: colors.grey_text,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  preview: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    borderColor: colors.primary,
    borderWidth: 1,
  },
});

export default ModalScreen;
