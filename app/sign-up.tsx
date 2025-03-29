// import React, { useState } from 'react';
// import { View, StyleSheet, TextInput, Alert } from 'react-native';
// import { Text } from 'react-native';
// import { Link, useRouter } from 'expo-router';
// import { Button } from 'react-native';

// export default function SignUpScreen() {
//   const { isLoaded, signUp, setActive } = useSignUp();
//   const router = useRouter();

//   const [emailAddress, setEmailAddress] = useState('');
//   const [password, setPassword] = useState('');
//   const [pendingVerification, setPendingVerification] = useState(false);
//   const [code, setCode] = useState('');
//   const [loading, setLoading] = useState(false);

//   // Handle submission of sign-up form
//   const onSignUpPress = async () => {

//     if (!isLoaded) return;
//     setLoading(true);
//     console.log("sign up pressed22");

//     try {
//       // Start sign-up process using email and password provided
//       await signUp.create({
//         emailAddress,
//         password,
//       });

//       // Send user an email with verification code
//       await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

//       // Set 'pendingVerification' to true to display second form
//       // and capture OTP code
//       setPendingVerification(true);
//     } catch (err: any) {
//       console.error(JSON.stringify(err, null, 2));
//       Alert.alert('Error', err.errors?.[0]?.message || 'Failed to sign up');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle submission of verification form
//   const onVerifyPress = async () => {
//     if (!isLoaded) return;
//     setLoading(true);

//     try {
//       // Use the code the user provided to attempt verification
//       const signUpAttempt = await signUp.attemptEmailAddressVerification({
//         code,
//       });

//       // If verification was completed, set the session to active
//       // and redirect the user
//       if (signUpAttempt.status === 'complete') {
//         await setActive({ session: signUpAttempt.createdSessionId });
//         router.replace('/(tabs)');
//       } else {
//         // If the status is not complete, check why. User may need to
//         // complete further steps.
//         console.error(JSON.stringify(signUpAttempt, null, 2));
//         Alert.alert('Error', 'Sign up process incomplete');
//       }
//     } catch (err: any) {
//       console.error(JSON.stringify(err, null, 2));
//       Alert.alert('Error', err.errors?.[0]?.message || 'Failed to verify email');
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (pendingVerification) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.header}>
//           <Text style={styles.title}>Verify your email</Text>
//           <Text style={styles.subtitle}>Enter the code sent to your email</Text>
//         </View>
        
//         <View style={styles.form}>
//           <TextInput
//             style={styles.input}
//             value={code}
//             placeholder="Verification code"
//             onChangeText={setCode}
//             keyboardType="number-pad"
//           />
          
//           <Button 
//             title={loading ? "Verifying..." : "Verify Email"}
//             onPress={onVerifyPress}
//             disabled={loading || !code}
//           />
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.title}>Better CareGive Assistant</Text>
//         <Text style={styles.subtitle}>Create an account</Text>
//       </View>
      
//       <View style={styles.form}>
//         <TextInput
//           style={styles.input}
//           autoCapitalize="none"
//           value={emailAddress}
//           placeholder="Email Address"
//           onChangeText={setEmailAddress}
//           keyboardType="email-address"
//         />
        
//         <TextInput
//           style={styles.input}
//           value={password}
//           placeholder="Password"
//           secureTextEntry={true}
//           onChangeText={setPassword}
//         />
        
//         <Button 
//           title={loading ? "Signing up..." : "Sign Up"}
//           onPress={onSignUpPress}
//           disabled={loading || !emailAddress || !password}
//         />
        
//         <View style={styles.spacing} />
        
//         <View style={styles.linkContainer}>
//           <Text style={styles.linkText}>Already have an account? </Text>
//           <Link href="/sign-in" asChild>
//             <Text style={styles.link}>Sign In</Text>
//           </Link>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     padding: 20,
//     backgroundColor: '#f5f5f5',
//   },
//   header: {
//     alignItems: 'center',
//     marginBottom: 40,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 30,
//   },
//   form: {
//     width: '100%',
//     maxWidth: 300,
//     alignSelf: 'center',
//   },
//   input: {
//     height: 50,
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     marginBottom: 16,
//     paddingHorizontal: 12,
//     backgroundColor: '#fff',
//   },
//   linkContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   linkText: {
//     color: '#666',
//   },
//   link: {
//     color: '#007AFF',
//     fontWeight: 'bold',
//   },
//   spacing: {
//     height: 20,
//   },
// });