import { create } from "zustand";
import { Id } from '../convex/_generated/dataModel';

// Define the types for our chat runtime
// export interface ChatRuntime {
//   id: string | null;
// }

interface VoiceChatStore {
    isInCall: boolean;
    setIsInCall: (isInCall: boolean) => void;
}

export const useVoiceChatStore = create<VoiceChatStore>((set) => ({
    isInCall: false,
    setIsInCall: (isInCall: boolean) => set({ isInCall }),
}));


// interface GeneralStateStore {
//   newThread: boolean;
//   setNewThread: (newThread: boolean) => void;
// }
// export const useGeneralStateStore = create<GeneralStateStore>((set) => ({
//     newThread: false,
//     setNewThread: (newThread: boolean) => set({ newThread }),
// }));