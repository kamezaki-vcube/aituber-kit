import { MessageInput } from "@/components/messageInput";
import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";

type Props = {
  isChatProcessing: boolean;
  onChatProcessStart: (text: string) => void;
  selectVoiceLanguage: string;
};

/**
 * テキスト入力と音声入力を提供する
 *
 * 音声認識の完了時は自動で送信し、返答文の生成中は入力を無効化する
 *
 */
export const MessageInputContainer = ({
  isChatProcessing,
  onChatProcessStart,
  selectVoiceLanguage
}: Props) => {
  const [userMessage, setUserMessage] = useState("");
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition>();
  //const [isMicRecording, setIsMicRecording] = useState(false);
  const isMicRecording = useRef<boolean>(false);
  const accumulatedMessage = useRef<string>("");

  // 音声認識の結果を処理する
  const handleRecognitionResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      var tempText = accumulatedMessage.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {

        //console.log("results[", i, "].isFinal=", event.results[i].isFinal, " isMicRecording=", isMicRecording.current);
        const currentText = event.results[i][0].transcript.trim();

        if (currentText !== "") {
          const delimiter = (accumulatedMessage.current.length === 0) ? "" : " ";

          // 発言の終了時
          if (event.results[i].isFinal) {
            accumulatedMessage.current += delimiter + currentText;
            setUserMessage(accumulatedMessage.current);
          }
          else {
            tempText += delimiter + currentText;
            setUserMessage(tempText);
          }
        }
      }
    },
    [setUserMessage]
  );

  const handleRecognitionEnd = useCallback((event:Event) => {
    if (!isMicRecording.current) {
      console.log("Recognition End, message=", accumulatedMessage.current);
      // 溜めていたメッセージの処理をする
      const text = accumulatedMessage.current;
      accumulatedMessage.current = "";
      if (text !== "") {
        onChatProcessStart(text);
      }
    }
  }, [onChatProcessStart]);

  const handleClickMicButton = useCallback(() => {
    console.log("handleClickMicButton isMicRecording=", isMicRecording.current);
    if (isMicRecording.current) {
      speechRecognition!.continuous = false;
      speechRecognition?.stop();
      isMicRecording.current = false;

      return;
    }

    speechRecognition!.continuous = true;
    speechRecognition?.start();
    isMicRecording.current = true;
  }, [speechRecognition, isMicRecording.current]);

  const handleClickSendButton = useCallback(() => {
    onChatProcessStart(userMessage);
  }, [onChatProcessStart, userMessage]);

  useEffect(() => {
    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition;

    // FirefoxなどSpeechRecognition非対応環境対策
    if (!SpeechRecognition) {
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = selectVoiceLanguage;
    recognition.interimResults = true; // 認識の途中結果を返す
    recognition.continuous = true; // 発言の終了時に認識を終了する

    recognition.addEventListener("result", handleRecognitionResult);
    recognition.addEventListener("end", handleRecognitionEnd);

    setSpeechRecognition(recognition);
  }, [handleRecognitionResult, handleRecognitionEnd, selectVoiceLanguage]);

  useEffect(() => {
    if (!isChatProcessing) {
      setUserMessage("");
    }
  }, [isChatProcessing]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      //console.log("handleKeyDown code=", event.code, " target=", event.target);
      if (event.code === 'Space' && event.target === document.body) { // スペースキーが押された
        event.preventDefault(); // スペースキーのデフォルト動作を防ぐ
        //startRecording();
        if (!isMicRecording.current) {
          handleClickMicButton();
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      //console.log("handleKeyUp code=", event.code, " target=", event.target);
      if (event.code === 'Space' && event.target === document.body) { // スペースキーが離された
        //stopRecording();
        if (isMicRecording.current) {
          handleClickMicButton();
        }
      }
    };

    // イベントリスナーを追加
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // コンポーネントがアンマウントされるときにイベントリスナーを削除
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleClickMicButton]);

  return (
    <MessageInput
      userMessage={userMessage}
      isChatProcessing={isChatProcessing}
      isMicRecording={isMicRecording.current}
      onChangeUserMessage={(e) => setUserMessage(e.target.value)}
      onClickMicButton={handleClickMicButton}
      onClickSendButton={handleClickSendButton}
    />
  );
};
