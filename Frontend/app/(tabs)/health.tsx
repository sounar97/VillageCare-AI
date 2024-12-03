import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { text: 'Hello! How can I help you today?', isBot: true },
  ]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Function to open Google Maps for Nearby Hospitals
  const handleFindHospitals = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to find nearby hospitals.');
        return;
      }

      // Fetch the current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Construct Google Maps URL
      const url = `https://www.google.com/maps/search/hospitals/@${latitude},${longitude},15z`;

      // Open the URL in the default browser (e.g., Chrome)
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open Google Maps.');
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'An error occurred while trying to fetch your location.');
    }
  }


  // Function to open the Buy Medicines website in Chrome
  const handleOpenWebsite = async () => {
    const url = 'https://janaushadhi.gov.in/ProductList.aspx';
    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open the website in your browser.');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'An unexpected error occurred while trying to open the website.');
    }
  };

  // Function to handle camera opening
  const handleCameraOpen = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to use this feature.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync();
    if (!result.canceled) {
      Alert.alert('Image Selected', 'You can now send the selected image.');
    }
  };

  // Function to handle message sending
  const handleSendMessage = async () => {
    if (message.trim() === '') {
      Alert.alert('Empty Message', 'Please type a message to send.');
      return;
    }

    // Add user message to chat
    setChatMessages((prevMessages) => [
      ...prevMessages,
      { text: message, isBot: false },
    ]);

    try {
      const response = await fetch('http://192.168.1.18:8080/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ msg: message }),
      });

      const jsonResponse = await response.json();
      const botResponse = jsonResponse.answer.replace(/System:/g, '').trim();

      setChatMessages((prevMessages) => [
        ...prevMessages,
        { text: botResponse, isBot: true },
      ]);

      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error fetching from backend:', error);
      Alert.alert('Error', 'Unable to connect to the server.');
    }

    setMessage('');
  };

  // Function to clear the chat messages
  const handleClearChat = () => {
    setChatMessages([
      { text: 'Hello! How can I help you today?', isBot: true },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
    {/* Header Buttons */}
    <View style={styles.headerButtons}>
      <TouchableOpacity style={styles.button} onPress={handleOpenWebsite}>
        <Icon name="local-pharmacy" size={28} color="#fff" />
        <Text style={styles.buttonText}>Buy Medicine</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleFindHospitals}>
        <Icon name="local-hospital" size={28} color="#fff" />
        <Text style={styles.buttonText}>Nearest Hospital</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => Alert.alert('Records Saving', 'Feature coming soon!')}>
        <Icon name="folder" size={28} color="#fff" />
        <Text style={styles.buttonText}>Save Records</Text>
      </TouchableOpacity>
    </View>
      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingTitle}>Welcome to Village Care</Text>
        <Text style={styles.greetingSubtitle}>Ask me your problem</Text>
      </View>

      {/* Chatbot Section */}
      <View style={styles.chatbotContainer}>
        <Text style={styles.chatTitle}>Chat with us</Text>
        <ScrollView
          style={styles.chatMessages}
          ref={scrollViewRef}
          onContentSizeChange={() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }}
        >
          {chatMessages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.chatBubble,
                msg.isBot ? styles.chatBubbleBot : styles.chatBubbleUser,
              ]}
            >
              <Text style={styles.chatText}>{msg.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.chatBox}>
          <TextInput
            placeholder="Type your query..."
            style={styles.chatInput}
            value={message}
            onChangeText={(text) => setMessage(text)}
          />
          <TouchableOpacity onPress={handleSendMessage}>
            <Icon name="send" size={28} color="#1e88e5" />
          </TouchableOpacity>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity
            onPress={() => Alert.alert('Voice Feature', 'Voice input feature coming soon!')}
          >
            <Icon name="mic" size={28} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCameraOpen} style={{ marginLeft: 10 }}>
            <Icon name="photo-camera" size={28} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40, // Adjusted spacing to move buttons down
  },
  button: {
    backgroundColor: '#1e88e5',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    width: '30%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  greetingSubtitle: {
    fontSize: 16,
    color: '#555',
  },
  chatbotContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  chatMessages: {
    maxHeight: 300,
    marginBottom: 10,
  },
  chatBubble: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  chatBubbleBot: {
    backgroundColor: '#e0f7fa',
    alignSelf: 'flex-start',
  },
  chatBubbleUser: {
    backgroundColor: '#f1f8e9',
    alignSelf: 'flex-end',
  },
  chatText: {
    color: '#333',
    fontSize: 14,
  },
  chatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    marginRight: 10,
  },
  iconContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearButton: {
    backgroundColor: '#ff5252',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
