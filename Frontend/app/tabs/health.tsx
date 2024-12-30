import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  ActivityIndicator,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { NavigationProp } from "@react-navigation/native";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

export default function HealthScreen({ navigation }: { navigation: NavigationProp<any> }) {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "Hello! How can I help you today?", isBot: true },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [imageMode, setImageMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const router = useRouter();

  const handleSaveRecords = () => router.push("/(tabs)/save-records");

  const handleOpenWebsite = async () => {
    const url = "https://janaushadhi.gov.in/ProductList.aspx";
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Error", "Unable to open the website.");
    }
  };

  const handleFindHospitals = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access is required.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const url = `https://www.google.com/maps/search/hospitals/@${latitude},${longitude},15z`;
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Error", "Unable to fetch location.");
    }
  };

  const handleSendMessage = async () => {
    if (message.trim() === "") {
      Alert.alert("Empty Message", "Please type a message.");
      return;
    }
    setChatMessages((prev) => [...prev, { text: message, isBot: false }]);
    setLoading(true);

    try {
      const response = await fetch("http://172.17.8.197:8080/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ msg: message, language: selectedLanguage }), // Include language
      });
      const json = await response.json();
      setChatMessages((prev) => [...prev, { text: json.answer, isBot: true }]);
      Speech.speak(json.answer, { language: selectedLanguage }); // Speak the response
    } catch (error) {
      Alert.alert("Error", "Failed to fetch response.");
    } finally {
      setLoading(false);
    }

    setMessage("");
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };
  const BACKEND_URL = "http://192.168.1.10:8080/voice";
// Function to start recording
const startRecording = async () => {
  try {
    console.log("Requesting permissions...");
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission Denied", "You need to grant microphone permissions.");
      return;
    }

    console.log("Starting recording...");
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
    console.log("Recording started...");
  } catch (err) {
    console.error("Failed to start recording:", err);
    Alert.alert("Error", "Could not start recording.");
  }
};

const stopRecording = async () => {
  if (!recording) return;

  console.log("Stopping recording...");
  setRecording(null);
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  console.log("Recording stopped and stored at", uri);

  if (uri) {
    try {
      const formData = new FormData();
      formData.append("audio", {
        uri,
        type: "audio/m4a", // Upload as .m4a (to be converted in backend)
        name: "recording.m4a",
      } as any);

      const response = await fetch("http://172.17.8.197:8080/voice", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      const json = await response.json();
      if (json.response) {
        setChatMessages((prev) => [...prev, { text: json.response, isBot: true }]);
        Speech.speak(json.response);
      } else {
        Alert.alert("Error", "Invalid response from the server.");
      }
    } catch (error) {
      console.error("Error during voice processing:", error);
      Alert.alert("Error", "Failed to process the audio.");
    }
  }
};



  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets) {
        setSelectedImage(result.assets[0].uri);
        setImageResult(null);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick an image.");
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert("Error", "Please select an image first.");
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", {
        uri: selectedImage,
        type: "image/jpeg",
        name: "skin_image.jpg",
      } as any);

      const response = await fetch("http://172.17.8.197:8080/analyze_image", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();
      if (json.result) {
        setImageResult(json.result);
      } else {
        Alert.alert("Error", "Invalid response from the server.");
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      Alert.alert("Error", "Failed to analyze the image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.button, { backgroundColor: "#4caf50" }]} onPress={handleSaveRecords}>
          <Icon name="folder" size={28} color="#fff" />
          <Text style={styles.buttonText}>Save Records</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: "#2196f3" }]} onPress={handleOpenWebsite}>
          <Icon name="local-pharmacy" size={28} color="#fff" />
          <Text style={styles.buttonText}>Buy Medicine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: "#ff9800" }]} onPress={handleFindHospitals}>
          <Icon name="local-hospital" size={28} color="#fff" />
          <Text style={styles.buttonText}>Find Hospital</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: "#9c27b0" }]} onPress={() => setImageMode(!imageMode)}>
          <Icon name="image" size={28} color="#fff" />
          <Text style={styles.buttonText}>{imageMode ? "Chat Mode" : "Image Mode"}</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.contentContainer} ref={scrollViewRef}>
        {imageMode ? (
          <View style={styles.imageContainer}>
            <TouchableOpacity style={[styles.button, { backgroundColor: "#4caf50" }]} onPress={handlePickImage}>
              <Text style={styles.buttonText}>Pick an Image</Text>
            </TouchableOpacity>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
            )}
            <TouchableOpacity style={[styles.button, { backgroundColor: "#ff5722" }]} onPress={handleAnalyzeImage}>
              <Text style={styles.buttonText}>Analyze Image</Text>
            </TouchableOpacity>
            {loading && <ActivityIndicator size="large" color="#1e88e5" />}
            {imageResult && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultText}>{imageResult}</Text>
              </View>
            )}
          </View>
        ) : (
          chatMessages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.chatBubble,
                msg.isBot ? styles.chatBubbleBot : styles.chatBubbleUser,
              ]}
            >
              <Text style={styles.chatText}>{msg.text}</Text>
            </View>
          ))
        )}
      </ScrollView>
{/* Language Selector */}
<View style={styles.languageSelector}>
        <Text style={styles.languageLabel}>Language:</Text>
        <Picker
          selectedValue={selectedLanguage}
          onValueChange={(itemValue) => setSelectedLanguage(itemValue)}
          style={styles.languagePicker}
        >
          <Picker.Item label="English" value="en" />
          <Picker.Item label="Hindi" value="hi" />
          <Picker.Item label="Kannada" value="kn" />
          <Picker.Item label="Malayalam" value="ml" />
          <Picker.Item label="Marathi" value="mr" />
          <Picker.Item label="Gujarati" value="gu" />
        </Picker>
      </View>
      {!imageMode && (
  <View style={styles.inputSection}>
    <TextInput
      style={styles.chatInput}
      placeholder="Type your message..."
      value={message}
      onChangeText={setMessage}
    />
    {/* Mic Button */}
    <TouchableOpacity onPress={recording ? stopRecording : startRecording}>
      <Icon
        name={recording ? "stop" : "mic"}
        size={28}
        color={recording ? "#e53935" : "#1e88e5"}
        style={{ marginRight: 10 }} // Add some spacing between buttons
      />
    </TouchableOpacity>
    {/* Send Button */}
    <TouchableOpacity onPress={handleSendMessage}>
      <Icon name="send" size={28} color="#1e88e5" />
    </TouchableOpacity>
  </View>
)}
</KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  header: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, backgroundColor: "#1e88e5" },
  button: { alignItems: "center", padding: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontSize: 12, marginTop: 5 },
  contentContainer: { flex: 1, paddingHorizontal: 10 },
  chatBubble: { padding: 10, borderRadius: 10, marginBottom: 10 },
  chatBubbleBot: { backgroundColor: "#e0f7fa", alignSelf: "flex-start" },
  chatBubbleUser: { backgroundColor: "#f1f8e9", alignSelf: "flex-end" },
  chatText: { fontSize: 14 },
  inputSection: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#f3f3f3" },
  chatInput: { flex: 1, fontSize: 16, marginRight: 10, borderRadius: 8, padding: 8 },
  imageContainer: { padding: 10, alignItems: "center" },
  previewImage: { width: "100%", height: 200, marginVertical: 10 },
  resultContainer: { marginTop: 10, padding: 10, backgroundColor: "#f1f8e9", borderRadius: 8 },
  resultText: { fontSize: 14, color: "#333" },
  languageSelector: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#f3f3f3" },
  languageLabel: { fontSize: 16, marginRight: 10 },
  languagePicker: { flex: 1, height: 50 },
});