import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addMedicalRecord, getMedicalRecords } from "../../lib/appwrite"; // Updated Appwrite import

export default function SaveRecordsScreen({ route, navigation }: any) {
  const userId = route?.params?.userId || "guest"; // Safely access userId or default to "guest"
  const [note, setNote] = useState("");
  const [image, setImage] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Pick Image Function
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const handleSave = async () => {
    if (!note && !image) {
      Alert.alert("Empty Record", "Please add a note or select an image.");
      return;
    }
  
    try {
      const userId = route?.params?.userId || "guest"; // Valid Document ID of the logged-in user
  
      const file = image
        ? {
            uri: image.uri,
            name: "health-record.jpg",
            type: "image/jpeg",
          }
        : null;
  
      const record = await addMedicalRecord(userId, note, file);
      Alert.alert("Success", "Record saved successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save record.");
    }
  };
  
  // Fetch Medical Records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await getMedicalRecords(userId);
      setRecords(data);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to fetch records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(); // Fetch records on component mount
  }, [userId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Save Health Records</Text>

      {/* Input Section */}
      <TextInput
        style={styles.input}
        placeholder="Enter your health note..."
        value={note}
        onChangeText={setNote}
      />

      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Select Image</Text>
      </TouchableOpacity>

      {image && (
        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.buttonText}>Save Record</Text>
      </TouchableOpacity>

      {/* Display Saved Records */}
      <Text style={styles.subtitle}>Your Health Records</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#1e88e5" />
      ) : (
        <ScrollView style={styles.recordsContainer}>
          {records.length > 0 ? (
            records.map((record) => (
              <View key={record.$id} style={styles.recordItem}>
                <Text style={styles.recordNote}>{record.notes}</Text>
                {record.images && (
                  <Image
                    source={{ uri: record.images }}
                    style={styles.recordImage}
                  />
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noRecordsText}>No records available.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#1e88e5",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  saveButton: {
    backgroundColor: "#43a047",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  subtitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  recordsContainer: { flex: 1, marginTop: 10 },
  recordItem: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  recordNote: { fontSize: 14, marginBottom: 5 },
  recordImage: { width: 100, height: 100, borderRadius: 8 },
  imagePreview: { width: 100, height: 100, borderRadius: 8, marginTop: 10 },
  noRecordsText: { textAlign: "center", color: "#777", fontSize: 16 },
});
