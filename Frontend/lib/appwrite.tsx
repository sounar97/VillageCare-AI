import { Client, Account, Databases, ID, Query, Storage } from "react-native-appwrite";

// Appwrite Configuration
export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1", // Replace with your Appwrite endpoint
  projectId: "6762b3fd000791205f19", // Replace with your Project ID
  databaseId: "6762c03000039a4f7d7c", // Replace with your Database ID
  recordsCollectionId: "6762c0b70025b1ed0b76", // Records Collection ID
  storageBucketId: "6762c47000145a00e9c2", // Storage Bucket ID
  userCollectionId:"6762c07500178435f0a9",
};

const client = new Client();
client.setEndpoint(appwriteConfig.endpoint).setProject(appwriteConfig.projectId);

const account = new Account(client);
const storage = new Storage(client);
const databases = new Databases(client);

// ---- User Management ----

export async function signInWithNameAndEmail(name: string, email: string) {
    try {
      // Check if user exists
      const existingUser = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal("email", email)]
      );
  
      if (existingUser.documents.length > 0) {
        // User exists, return their document
        return existingUser.documents[0]; // Includes the Document ID
      } else {
        // Create a new user document
        const newUser = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          ID.unique(),
          {
            username: name,
            email: email,
          }
        );
        return newUser; // Includes the Document ID
      }
    } catch (error: any) {
      throw new Error(error.message || "Error signing in or registering user.");
    }
  }
  
  export async function addMedicalRecord(
    userId: string, // This must be a valid Document ID from the 'users' collection
    notes: string,
    file?: any
  ) {
    try {
      let fileUrl = null;
  
      if (file) {
        const uploadedFile = await storage.createFile(
          appwriteConfig.storageBucketId,
          ID.unique(),
          file
        );
        fileUrl = storage.getFileView(appwriteConfig.storageBucketId, uploadedFile.$id);
      }
  
      const newRecord = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.recordsCollectionId,
        ID.unique(),
        {
          users: userId, // Pass valid user Document ID here
          notes: notes,
          images: fileUrl,
        }
      );
  
      return newRecord;
    } catch (error: any) {
      throw new Error(error.message || "Error adding medical record.");
    }
  }
  
  
  // Get Medical Records for the User
  export async function getMedicalRecords(userId: string) {
    try {
      const records = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.recordsCollectionId,
        [Query.equal("users", userId)] // Filter by relationship field
      );
  
      return records.documents;
    } catch (error: any) {
      throw new Error(error.message || "Error fetching medical records");
    }
  }
  
  // Delete Medical Record
  export async function deleteMedicalRecord(recordId: string) {
    try {
      const result = await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.recordsCollectionId,
        recordId
      );
      return result;
    } catch (error: any) {
      throw new Error(error.message || "Error deleting medical record");
    }
  }
  
  // Upload File to Storage
  export async function uploadFile(file: any) {
    try {
      const uploadedFile = await storage.createFile(
        appwriteConfig.storageBucketId,
        ID.unique(),
        file
      );
      const fileUrl = storage.getFileView(appwriteConfig.storageBucketId, uploadedFile.$id);
      return fileUrl;
    } catch (error: any) {
      throw new Error(error.message || "Error uploading file");
    }
  }
