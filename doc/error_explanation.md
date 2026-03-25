# 오류 및 경고 메시지 분석

현재 콘솔에 나타나는 메시지는 크게 두 가지로, 하나는 **Google Maps API의 권고 사항**이고 하나는 **Firebase Firestore의 필수 설정 오류**입니다.

## 1. Google Maps Deprecation (권고)
> `google.maps.Marker is deprecated. Please use google.maps.marker.AdvancedMarkerElement instead.`

### **의미**
- Google Maps에서 기존에 사용하던 `Marker` 클래스를 '구식(Deprecated)'으로 분류했습니다.
- 앞으로는 더 빠르고 기능이 많은 `AdvancedMarkerElement`를 사용하도록 권장하고 있습니다.
- 당장 지도가 안 나오거나 오류가 나는 것은 아니지만, 향후 지원이 중단될 수 있으므로 업데이트가 필요합니다.

### **해결 방법**
- 프로젝트에서 사용 중인 `@vis.gl/react-google-maps` 라이브러리의 `Marker` 컴포넌트를 `AdvancedMarker`로 교체해야 합니다. (교체 시 Google Cloud Console에서 Map ID 설정이 추가로 필요할 수 있습니다.)

---

## 2. Firebase Firestore Index Error (오류)
> `Uncaught (in promise) FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/projectsns-fbb6a/firestore...`

### **의미**
- Firestore에서 특정 데이터를 조회(Query)하려고 할 때, **'복합 인덱스(Composite Index)'**가 없어서 발생하는 오류입니다.
- Firestore는 보안과 성능을 위해 여러 필드를 동시에 필터링하거나 특정 순서로 정렬할 때 미리 "인덱스"라는 길을 닦아두어야 합니다. 이 길이 없어서 데이터를 가져오지 못하고 있는 상태입니다.

### **해결 방법**
- **가장 간단한 방법:** 브라우저 콘솔 창에 뜬 **파란색 URL 링크**를 클릭하세요.
- 링크를 클릭하면 Firebase 콘솔의 인덱스 생성 페이지로 바로 연결되며, [인덱스 만들기] 버튼만 누르면 해결됩니다.
- 인덱스 생성에는 약 3~5분 정도 소요되며, 완료된 후에는 오류 없이 데이터가 정상적으로 표시됩니다.

---

### **정리**
- **Google Maps 메시지:** 나중에 고쳐도 되는 권고 사항입니다.
- **Firebase 메시지:** 현재 데이터가 불러와지지 않는 원인이므로, **콘솔의 링크를 클릭하여 인덱스를 생성**하는 것이 급선무입니다.
