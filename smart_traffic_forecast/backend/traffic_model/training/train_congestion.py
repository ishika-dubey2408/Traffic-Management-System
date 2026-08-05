
import pandas as pd
import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# -------------------------------------------------
# Current Directory
# -------------------------------------------------

current_dir = os.path.dirname(__file__)

# -------------------------------------------------
# Dataset Path
# -------------------------------------------------

file_path = os.path.join(
    current_dir,
    "..",
    "data",
    "raw",
    "traffic.csv"
)

# -------------------------------------------------
# Load Dataset
# -------------------------------------------------

df = pd.read_csv(file_path)

# -------------------------------------------------
# Merge Classes
# -------------------------------------------------

df["Traffic Situation"] = df["Traffic Situation"].replace({
    "normal": "medium",
    "heavy": "high"
})

# -------------------------------------------------
# Feature Engineering
# -------------------------------------------------

df["Hour"] = pd.to_datetime(
    df["Time"],
    format="%I:%M:%S %p"
).dt.hour

df["Day"] = df["Date"]

day_encoder = LabelEncoder()

df["Day of week"] = day_encoder.fit_transform(
    df["Day of the week"]
)

traffic_encoder = LabelEncoder()

df["Traffic Situation"] = traffic_encoder.fit_transform(
    df["Traffic Situation"]
)

# -------------------------------------------------
# Features
# -------------------------------------------------

X = df[
    [
        "Hour",
        "Day",
        "Day of week",
        "CarCount",
        "BikeCount",
        "BusCount",
        "TruckCount",
        "Total"
    ]
]

# -------------------------------------------------
# Target
# -------------------------------------------------

y = df["Traffic Situation"]

# -------------------------------------------------
# Train Test Split
# -------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# -------------------------------------------------
# Train Model
# -------------------------------------------------

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42
)

model.fit(X_train, y_train)

# -------------------------------------------------
# Prediction
# -------------------------------------------------

prediction = model.predict(X_test)

# -------------------------------------------------
# Accuracy
# -------------------------------------------------

print("\nAccuracy:\n")

print(
    accuracy_score(
        y_test,
        prediction
    )
)

# -------------------------------------------------
# Classification Report
# -------------------------------------------------

print("\nClassification Report:\n")

print(
    classification_report(
        y_test,
        prediction,
        target_names=traffic_encoder.classes_
    )
)

# -------------------------------------------------
# Confusion Matrix
# -------------------------------------------------

print("\nTraffic Classes:")

print(traffic_encoder.classes_)

print("\nPredicted Classes:")

print(sorted(set(prediction)))

print("\nActual Classes:")

print(sorted(set(y_test)))

print("\nConfusion Matrix:\n")

print(
    confusion_matrix(
        y_test,
        prediction
    )
)

# -------------------------------------------------
# Save Model
# -------------------------------------------------

model_path = os.path.join(
    current_dir,
    "..",
    "models",
    "congestion_model.pkl"
)

joblib.dump(
    model,
    model_path
)

# -------------------------------------------------
# Save Traffic Encoder
# -------------------------------------------------

traffic_encoder_path = os.path.join(
    current_dir,
    "..",
    "models",
    "traffic_encoder.pkl"
)

joblib.dump(
    traffic_encoder,
    traffic_encoder_path
)

# -------------------------------------------------
# Save Day Encoder
# -------------------------------------------------

day_encoder_path = os.path.join(
    current_dir,
    "..",
    "models",
    "day_encoder.pkl"
)

joblib.dump(
    day_encoder,
    day_encoder_path
)

print("\nCongestion Model Saved Successfully!")