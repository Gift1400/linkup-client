import { StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Text, View } from '@/components/Themed';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getChatsForUser, getMatchById, getUser } from '@/scripts/userapi';
import { ChatDTO, Message } from '@/scripts/userapi';

interface MatchInfo {
  matchId: number;
  firstName: string;
  lastName: string;
  image: string | null;
}

export default function ChatsScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [chats, setChats] = useState<ChatDTO[]>([]);
  const [matches, setMatches] = useState<Record<number, MatchInfo>>({});
  const router = useRouter();

  const fetchMatchInfo = async (matchId: number, currentUserId: number) => {
    try {
      const match = await getMatchById(matchId);
      if (!match) return null;

      // Get the other user in the match
      const otherUserId = match.user1Id === currentUserId ? match.user2Id : match.user1Id;
      const user = await getUser(otherUserId);

      return {
        matchId,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        image: user?.imageBase64 || null,
      };
    } catch (err) {
      console.error('Error fetching match data:', err);
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await import('@/scripts/db').then(module =>
          module.getFromStorage('user')
        );

        if (!user) {
          router.replace('/login');
          return;
        }

        setUserData(user);
        const rawData: any = user;
        const id = rawData.user.userId;
        setUserId(id);

        const chatsData = await getChatsForUser(id);
        if (chatsData) setChats(chatsData);

        // Fetch match info for each chat
        if (chatsData) {
          const matchPromises = chatsData.map(chat => fetchMatchInfo(chat.matchId, id));
          const matchResults = await Promise.all(matchPromises);
          const matchMap: Record<number, MatchInfo> = {};
          matchResults.forEach(m => {
            if (m) matchMap[m.matchId] = m;
          });
          setMatches(matchMap);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  const renderLastMessage = (messages: Message[]) => {
    if (!messages || messages.length === 0) return 'No messages yet';
    return messages[messages.length - 1].content;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chats</Text>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {chats.map(chat => {
          const matchInfo = matches[chat.matchId];

          return (
            <Pressable
              key={chat.chatId}
              style={styles.cardContent}
              onPress={() =>
                router.push({
                  pathname: '/chatscreen',
                  params: {
                    chatId: chat.chatId.toString(),
                    matchId: chat.matchId.toString(),
                    firstName: matchInfo?.firstName || '',
                    lastName: matchInfo?.lastName || '',
                    image: matchInfo?.image || '',
                  },
                })
              }
            >
              <View style={styles.cardContent}>
                {matchInfo?.image ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${matchInfo.image}` }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.placeholder]} />
                )}

                <View style={styles.textContainer}>
                  <Text style={styles.matchText}>
                    {matchInfo ? `${matchInfo.firstName} ${matchInfo.lastName}` : 'Loading...'}
                  </Text>
                  <Text style={styles.lastMessage}>{renderLastMessage(chat.messages)}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
        {chats.length === 0 && (
          <Text style={styles.emptyMessage}>No chats available</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: '#ddd',
  },
  matchText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
});
