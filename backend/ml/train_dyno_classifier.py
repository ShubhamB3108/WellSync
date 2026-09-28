import os
import sys
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score
from sklearn.ensemble import GradientBoostingClassifier

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml.synth_dyno_dataset import generate_synthetic_dataset
from app.services.dyno_classifier import CLASSES
from app.core.config import settings

def train_and_save_model():
    print("Generating synthetic dynamometer card dataset...")
    X, y = generate_synthetic_dataset(samples_per_class=200)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training classifier on {len(X_train)} samples...")
    # Use GradientBoostingClassifier or XGBClassifier for robust tabular inference
    clf = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=4,
        random_state=42
    )
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    report = classification_report(y_test, y_pred, target_names=CLASSES)
    print("\n--- Model Evaluation Report ---")
    print(report)
    
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    print(f"Macro F1 Score: {macro_f1:.4f}")
    
    # Save model
    os.makedirs(os.path.dirname(settings.DYNO_MODEL_PATH), exist_ok=True)
    joblib.dump(clf, settings.DYNO_MODEL_PATH)
    print(f"Trained model successfully saved to: {settings.DYNO_MODEL_PATH}")

if __name__ == "__main__":
    train_and_save_model()
