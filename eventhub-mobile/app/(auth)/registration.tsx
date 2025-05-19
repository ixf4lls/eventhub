import InputField from '@/components/InputField'
import { colors } from '@/constants/colors'
import React, { useContext, useState } from 'react'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useRouter } from 'expo-router'
import { AuthContext } from '../../src/context/AuthContext'
import { fonts } from '@/constants/fonts'
import * as Haptics from 'expo-haptics'
import CustomButton from '@/components/CustomButton'
import { API_BASE_URL } from '@/constants/address'

const SignIn = () => {
  const [first_name, setfirst_name] = useState('')
  const [last_name, setlast_name] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeatedPassword, setRepeatedPassword] = useState('')
  const [error, setError] = useState('')
  const auth = useContext(AuthContext)

  const handleRegistration = async () => {
    if (
      !first_name ||
      !last_name ||
      !username ||
      !password ||
      !repeatedPassword
    ) {
      Alert.alert('Ошибка', 'Указаны не все поля')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    if (password !== repeatedPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен содержать хотя бы 6 символов')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    try {
      const response = await fetch(
        API_BASE_URL + '/api/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ first_name, last_name, username, password }),
        }
      )
      const data = await response.json()
      if (response.ok && auth) {
        auth.login(data.access_token, data.refresh_token)
        router.replace('../(root)/(tabs)/home')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        Alert.alert('Ошибка', data.error)
      }
    } catch (error) {
      Alert.alert('Ошибка сервера', 'Проверьте подключение.')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  return (
    <SafeAreaView style={styles.content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
            contentContainerStyle={styles.scrollView}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Создание аккаунта</Text>

            <View style={styles.form}>
              <View style={styles.form__element}>
                <Text style={styles.element_title}>Имя</Text>
                <InputField
                  value={first_name}
                  onChangeText={(first_name) => setfirst_name(first_name)}
                  placeholder="Введите имя"
                />
              </View>
              <View style={styles.form__element}>
                <Text style={styles.element_title}>Фамилия</Text>
                <InputField
                  value={last_name}
                  onChangeText={(last_name) => setlast_name(last_name)}
                  placeholder="Введите фамилию"
                />
              </View>
              <View style={styles.form__element}>
                <Text style={styles.element_title}>Имя пользователя</Text>
                <InputField
                  value={username}
                  onChangeText={(username) => setUsername(username)}
                  placeholder="Введите имя пользователя"
                />
              </View>
              <View style={styles.form__element}>
                <Text style={styles.element_title}>Пароль</Text>
                <View style={styles.password}>
                  <InputField
                    value={password}
                    onChangeText={(password) => setPassword(password)}
                    secureTextEntry={true}
                    placeholder="Введите пароль"
                  />
                </View>
                <View style={styles.repeatedPassword}>
                  <InputField
                    value={repeatedPassword}
                    onChangeText={(repeatedPassword) =>
                      setRepeatedPassword(repeatedPassword)
                    }
                    secureTextEntry={true}
                    placeholder="Подтвердите пароль"
                  />
                </View>
              </View>
            </View>

            <CustomButton
              onPress={handleRegistration}
              title={'Зарегистрироваться'}
              type={'action'}
              fill={'solid'}
            />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    height: '100%',
  },
  scrollView: {
    height: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: colors.black,
    fontFamily: fonts.Unbounded,
  },
  form: {
    marginTop: 24,
  },
  form__element: {
    marginBottom: 16,
  },
  element_title: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    fontFamily: fonts.Montserrat,
  },
  password: {
    marginBottom: 8,
  },
  repeatedPassword: {
    marginBottom: 8,
  },
})

export default SignIn
