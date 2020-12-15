import { StatusBar } from "expo-status-bar";
import React from "react";
import { Button, Text, TextInput, View } from "react-native";
import { withAuthenticator } from "aws-amplify-react-native";
import config from "./src/aws-exports";
import Amplify, { API, Auth, graphqlOperation } from "aws-amplify";
import { listMessages } from "./src/graphql/queries";
import { createMessage } from "./src/graphql/mutations";
import { onCreateMessage } from "./src/graphql/subscriptions";

type Message = {
  id?: string;
  username: string;
  content: string;
};

Amplify.configure({
  ...config,
  Analytics: {
    disabled: true,
  },
});

const App = () => {
  const [username, setUsername] = React.useState("");
  const [inputMessage, setInputMessage] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);

  React.useEffect(() => {
    fetchMessages();
    (async () => {
      const currentUsername = (await Auth.currentUserInfo()).username;
      setUsername(currentUsername);
    })();
    const subscription = API.graphql(
      graphqlOperation(onCreateMessage)
      // @ts-ignore
    ).subscribe({
      next: (eventData: any) => {
        const message = eventData.value.data.onCreateMessage;
        setMessages((prev) => [message, ...prev]);
      },
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchMessages = async () => {
    try {
      const messageData: any = await API.graphql(
        graphqlOperation(listMessages)
      );
      const messages = messageData.data.listMessages.items.sort(
        (a: any, b: any) => (a.createdAt > b.createdAt ? -1 : 1)
      );
      setMessages(messages);
    } catch (err) {
      console.log("error fetching messages:", err);
      err.errors.map((error: any) => console.log(error));
    }
  };

  const postMessage = async () => {
    try {
      const message = {
        content: inputMessage,
        username,
      };
      setInputMessage("");
      await API.graphql(graphqlOperation(createMessage, { input: message }));
    } catch (err) {
      console.log("error creating message:", err);
    }
  };

  return (
    <View
      style={{ alignItems: "center", justifyContent: "center", height: "100%" }}
    >
      <View style={{ backgroundColor: "lightgray", padding: 32 }}>
        {messages.map((message) => (
          <View style={{ flexDirection: "row" }} key={message.id}>
            <Text>{message.username}: </Text>
            <Text>{message.content}</Text>
          </View>
        ))}
      </View>
      <View>
        <Text></Text>
        <TextInput
          style={{
            height: 40,
            width: 200,
            borderColor: "gray",
            borderWidth: 1,
          }}
          onChangeText={(text) => setInputMessage(text)}
          value={inputMessage}
        />
        <Button title="送信" onPress={() => postMessage()} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
};

export default withAuthenticator(App);
