import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { Modal, Platform, Pressable, StyleSheet, Text } from "react-native";

import { Colors } from "@/constants/theme";

/**
 * The shared "Fecha" picker for every add-movement form. iOS shows an inline
 * calendar inside a modal sheet (commit on "Listo"); Android uses the native
 * dialog, which closes itself and commits only on "set". `value`/`onChange`
 * speak the form's `YYYY-MM-DD` string.
 */
export function MovementDatePicker({
  value,
  visible,
  onChange,
  onClose,
}: {
  value: string; // YYYY-MM-DD
  visible: boolean;
  onChange: (date: string) => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  const onAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android dialog closes itself on any action; commit only on "set".
    onClose();
    if (event.type === "set" && selected) {
      onChange(format(selected, "yyyy-MM-dd"));
    }
  };

  if (Platform.OS !== "ios") {
    return <DateTimePicker value={parseISO(value)} mode="date" maximumDate={new Date()} onChange={onAndroidChange} />;
  }

  return (
    <Modal transparent animationType="fade" visible>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet}>
          <DateTimePicker
            value={parseISO(value)}
            mode="date"
            display="inline"
            maximumDate={new Date()}
            themeVariant="dark"
            accentColor={Colors.accent}
            onChange={(_, d) => d && onChange(format(d, "yyyy-MM-dd"))}
          />
          <Pressable style={styles.modalDone} onPress={onClose}>
            <Text style={styles.modalDoneText}>Listo</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7,10,28,0.7)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  modalDone: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: Colors.accent,
  },
  modalDoneText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#04211E",
  },
});
