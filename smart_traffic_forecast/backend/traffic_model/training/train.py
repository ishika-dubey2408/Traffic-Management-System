import pandas as pd
import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error


# Dataset path
current_dir = os.path.dirname(__file__)

file_path = os.path.join(
    current_dir,
    "..",
    "data",
    "raw",
    "traffic.csv"
)


# Load dataset
df = pd.read_csv(file_path)


# Convert date_time
df["date_time"] = pd.to_datetime(df["date_time"])

df["hour"] = df["date_time"].dt.hour
df["day"] = df["date_time"].dt.day
df["month"] = df["date_time"].dt.month


# Encode text columns
encoder = LabelEncoder()

for col in ["weather_main", "weather_description"]:
    df[col] = encoder.fit_transform(df[col])


# Features
X = df[
    [
        "temp",
        "rain_1h",
        "snow_1h",
        "clouds_all",
        "weather_main",
        "weather_description",
        "hour",
        "day",
        "month"
    ]
]


# Target
y = df["traffic_volume"]


# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)


# Train model
model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)


# Test model
prediction = model.predict(X_test)

error = mean_absolute_error(
    y_test,
    prediction
)

print("MAE:", error)


# Save model
model_path = os.path.join(
    current_dir,
    "..",
    "models",
    "traffic_model.pkl"
)

joblib.dump(model, model_path)

print("Model saved successfully!")