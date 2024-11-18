# **XAI-TRIS: Non-linear Image Benchmarks to Quantify False Positive Post-hoc Attribution of Feature Importance**

---

Access the paper here:  
[XAI-TRIS: Non-linear image benchmarks to quantify false positive post-hoc attribution of feature importance.pdf](https://github.com/user-attachments/files/17801915/XAI-TRIS.Non-linear.image.benchmarks.to.quantify.false.positive.post-hoc.attribution.of.feature.importance.pdf)
Github repository: https://github.com/braindatalab/xai-tris 

---

## **Zusammenfassung (German)**  

Das Dokument befasst sich mit Erklärbarer Künstlicher Intelligenz (XAI) und zielt darauf ab, XAI-Methoden zu bewerten, die die Entscheidungsfindung komplexer KI-Modelle nachvollziehbarer machen sollen.  

Im Folgenden eine Zusammenfassung der Ziele, des Vorgehens, der Lösungsansätze und der Ergebnisse:

---

### **Ziele**  
- **Bewertung von XAI-Methoden:** Quantitative Bewertung verschiedener Methoden zur Erklärung der Wichtigkeit von Eingabe-Merkmalen.  
- **Nachweis von Schwächen:** Untersuchung, wie gut XAI-Methoden relevante Merkmale identifizieren und falsche Zuordnungen (z. B. zu irrelevanten Merkmalen) vermeiden.  
- **Vergleich von Modellen:** Bewertung der Konsistenz von Erklärungen über verschiedene Modelle (z. B. lineare Regression, neuronale Netze).  
- **Realisierung realistischer Szenarien:** Verwendung realistischer, nicht-linearer Klassifikationsprobleme zur besseren Überprüfung.  

---

### **Vorgehen**  
1. **Datengenerierung:** Erstellung synthetischer Bilddatensätze mit bekannten relevanten Merkmalen (z. B. geometrische Formen wie Tetrominos) als Grundwahrheit.  
2. **Szenarien:** Linear, Multiplikativ, Translation/Rotation, XOR-Problem.  
3. **Hintergrundvarianten:** Weißes Rauschen, korrelierter Hintergrund, Bilder aus ImageNet.  
4. **Metriken:** Einführung neuer Leistungskennzahlen wie der _Earth Mover’s Distance (EMD)_ und _Importance Mass Accuracy (IMA)_, die falsche Zuordnungen in den Erklärungen bewerten.  
5. **XAI-Methoden und Modelle:** Vergleich von 16 XAI-Methoden auf drei Modelltypen:  
   - Lineare Regression  
   - Multi-Layer Perceptron  
   - Convolutional Neural Network  

---

### **Lösungen und Ergebnisse**  

#### **Leistungsanalyse**  
- Viele XAI-Methoden haben Schwierigkeiten, die tatsächlich relevanten Merkmale zu identifizieren.  
- **Korrelationen im Hintergrund** (Suppressor-Variablen) führen oft zu falschen Erklärungen.  
- Edge-Detection-Methoden wie der Laplace-Filter sind in manchen Szenarien effektiver als spezialisierte XAI-Ansätze.  
- **Konsistenzprobleme:** Unterschiedliche Modelle liefern oft widersprüchliche Erklärungen, selbst wenn sie ähnliche Klassifikationsleistungen zeigen.  

#### **Bewertung der XAI-Methoden**  
- Keine Methode ist universell am besten.  
- Leistung variiert stark je nach Szenario und Modellarchitektur.  

#### **Relevanz für die Praxis**  
- **Falsche Zuordnungen** können schwerwiegende Konsequenzen haben, z. B. falsche Rückschlüsse im medizinischen Bereich.  

---

### **Ergebnisse**  
Das Papier hebt hervor, dass viele der aktuellen XAI-Methoden **nicht robust genug** sind, insbesondere in Szenarien mit **nicht-linearen Zusammenhängen** und **Suppressor-Variablen**.  
Es schlägt neue Standards für die objektive Bewertung von Erklärungsqualität vor und betont die Notwendigkeit konsistenter und verständlicher Ergebnisse in kritischen Anwendungen.  

---
