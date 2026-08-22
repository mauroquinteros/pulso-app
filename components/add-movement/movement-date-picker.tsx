import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { Modal, Platform, Pressable, StyleSheet } from "react-native";

import { isDayTap } from "@/components/add-movement/date-picker-dismiss";
import { Colors } from "@/constants/theme";

/**
 * The shared "Fecha" picker for every add-movement form. iOS shows an inline
 * calendar inside a modal sheet; Android uses the native dialog, which closes
 * itself and commits only on "set". `value`/`onChange` speak the form's
 * `YYYY-MM-DD` string.
 *
 * The iOS sheet commits on every change and closes as soon as you tap a day,
 * the way every other calendar picker behaves. Telling a day tap apart from a
 * month/year wheel scroll -- which must not dismiss -- is `isDayTap`.
 *
 * There is no confirm button: the date is already saved by the time you could
 * press one. The sheet is dismissed by tapping a day, or by tapping the
 * backdrop -- which is the only way out of the one case a day tap cannot
 * cover, changing month or year and keeping the same day number, which fires
 * no change to close on.
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

  const onInlineChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    onChange(format(selected, "yyyy-MM-dd"));
    if (isDayTap(value, selected)) onClose();
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
            onChange={onInlineChange}
          />
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
});
