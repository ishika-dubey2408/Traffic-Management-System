
import os
import pandas as pd
from sklearn.preprocessing import LabelEncoder

# ----------------------------
# Load Dataset
# ----------------------------
base_dir = os.path.dirname(os.path.dirname(__file__))
csv_path = os.path.join(base_dir, "data", "raw", "TrafficTwoMonth.csv")

df = pd.read_csv(csv_path)

# ----------------------------
# Convert Time into Hour & Minute
# ----------------------------
df["Time"] = pd.to_datetime(df["Time"], format="%I:%M:%S %p")

df["Hour"] = df["Time"].dt.hour
df["Minute"] = df["Time"].dt.minute

# ----------------------------
# Encode Day of the Week
# ----------------------------
day_encoder = LabelEncoder()
df["Day"] = day_encoder.fit_transform(df["Day of the week"])

# ----------------------------
# Encode Traffic Situation
# ----------------------------
traffic_encoder = LabelEncoder()
df["Traffic_Label"] = traffic_encoder.fit_transform(df["Traffic Situation"])

# ----------------------------
# Remove old columns
# ----------------------------
df.drop(columns=["Time", "Day of the week", "Traffic Situation"], inplace=True)

# ----------------------------
# Save Processed Dataset
# ----------------------------
processed_path = os.path.join(base_dir, "data", "processed", "processed_traffic.csv")

os.makedirs(os.path.dirname(processed_path), exist_ok=True)

df.to_csv(processed_path, index=False)

print("✅ Preprocessing completed successfully!")
print("Processed dataset saved at:")
print(processed_path)

print("\nFirst 5 Rows:")
print(df.head())