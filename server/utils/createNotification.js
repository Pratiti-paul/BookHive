import Notification from "../models/Notification.js";

const createNotification = async ({
  recipient,
  title,
  message,
  type = "General",
}) => {
  try {
    await Notification.create({
      recipient,
      title,
      message,
      type,
    });
  } catch (error) {
    console.error("Notification Error:", error.message);
  }
};

export default createNotification;