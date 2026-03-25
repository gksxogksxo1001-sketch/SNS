# 🎓 SNS 프로젝트 코드 읽는 법 가이드

> 이 문서는 현재 프로젝트의 코드를 **처음부터 읽을 수 있도록** 도와주는 가이드입니다.
> HTML/CSS/JS를 아는 분이라면, React/Next.js 코드도 충분히 읽을 수 있습니다!

---

## 📁 1단계: 프로젝트 폴더 구조 이해하기

```
src/
├── app/                    ← 📄 페이지들 (URL과 1:1 매칭)
│   ├── (auth)/             ← 로그인/회원가입 페이지
│   ├── (main)/             ← 로그인 후 보이는 메인 페이지들
│   │   ├── feed/page.tsx       → localhost:3000/feed
│   │   ├── map/page.tsx        → localhost:3000/map
│   │   ├── messages/page.tsx   → localhost:3000/messages
│   │   ├── profile/page.tsx    → localhost:3000/profile
│   │   ├── notifications/      → localhost:3000/notifications
│   │   └── layout.tsx          → 모든 메인 페이지의 공통 틀
│   └── layout.tsx          ← 전체 앱의 최상위 틀
│
├── components/             ← 🧩 재사용 가능한 부품들
│   ├── features/           ← 기능별 컴포넌트 (PostCard, Stories 등)
│   └── ui/                 ← 공통 UI (버튼, 모달 등)
│
├── core/                   ← ⚙️ 핵심 로직
│   ├── firebase/           ← Firebase 연동 (DB 읽기/쓰기)
│   │   ├── postService.ts      → 게시물 관련 함수들
│   │   ├── storyService.ts     → 스토리 관련 함수들
│   │   └── messageService.ts   → 채팅 관련 함수들
│   └── hooks/              ← React 커스텀 훅
│       └── useAuth.ts          → 로그인 상태 확인
│
└── types/                  ← 📝 타입 정의 (데이터 모양 설명서)
    ├── post.ts                 → 게시물 데이터 구조
    └── user.ts                 → 사용자 데이터 구조
```

### 핵심 규칙
- **`page.tsx`** 파일 = 하나의 **웹 페이지** (HTML 파일 1개라고 생각하면 됨)
- **폴더 이름** = **URL 경로** (`feed/page.tsx` → `localhost:3000/feed`)
- **`layout.tsx`** = 여러 페이지에서 공통으로 쓰는 **틀** (사이드바, 네비게이션 등)

---

## 🔄 2단계: JSX는 HTML이랑 거의 같다

### 기본 비교표

| HTML (원래 아는 것) | JSX (지금 프로젝트) | 설명 |
|---|---|---|
| `class="box"` | `className="box"` | 🔤 이름만 다름 |
| `onclick="fn()"` | `onClick={() => fn()}` | 🖱️ 이벤트 처리 |
| `<label for="id">` | `<label htmlFor="id">` | 🏷️ 이름만 다름 |
| `style="color: red"` | `style={{color: 'red'}}` | 🎨 중괄호 2개 |
| `<!-- 주석 -->` | `{/* 주석 */}` | 💬 주석 방식 |

### 실제 코드로 비교

#### 바닐라 HTML로 쓰면:
```html
<div class="header">
  <img src="logo.png" alt="로고">
  <h1>SNS 피드</h1>
  <button onclick="openSearch()">검색</button>
</div>

<div class="post-list" id="posts">
  <!-- 자바스크립트로 여기에 게시물을 넣어야 함 -->
</div>

<script>
  // 게시물 데이터를 가져와서 직접 HTML을 만들어 넣기
  fetch('/api/posts').then(res => res.json()).then(posts => {
    const container = document.getElementById('posts');
    posts.forEach(post => {
      container.innerHTML += `<div class="post">${post.content}</div>`;
    });
  });
</script>
```

#### 같은 것을 React JSX로 쓰면:
```tsx
// ✅ HTML 부분과 로직이 한 파일에 깔끔하게!
<div className="header">
  <img src="logo.png" alt="로고" />
  <h1>SNS 피드</h1>
  <button onClick={() => openSearch()}>검색</button>
</div>

<div className="post-list">
  {posts.map(post => (          // ← 배열을 자동으로 반복!
    <div className="post" key={post.id}>
      {post.content}            // ← 변수 값을 바로 표시!
    </div>
  ))}
</div>
```

### 💡 핵심 포인트
> **`{중괄호}` 안에 있는 것 = 자바스크립트**  
> 중괄호 밖에 있는 것 = HTML과 동일

---

## ⚡ 3단계: React 핵심 패턴 4가지만 알면 된다

### 패턴 1: `useState` — 변하는 데이터 저장

```tsx
const [count, setCount] = useState(0);
//     ↑변수    ↑변경함수            ↑초기값

// 바닐라 JS로 치면:
// let count = 0;
// function setCount(newVal) { count = newVal; 화면갱신(); }
```

**프로젝트 실제 예시 (feed/page.tsx):**
```tsx
const [posts, setPosts] = useState<Post[]>([]);        // 게시물 목록 (빈 배열로 시작)
const [isLoading, setIsLoading] = useState(true);      // 로딩 중인지 (true로 시작)
const [searchQuery, setSearchQuery] = useState("");     // 검색어 (빈 문자열로 시작)
```

### 패턴 2: `useEffect` — 페이지 로드 시 실행

```tsx
useEffect(() => {
  // 이 안의 코드는 페이지가 열릴 때 자동 실행됨
  // 바닐라 JS의 window.onload 와 비슷!
  fetchPosts();
}, []);  // ← 빈 배열 = 처음 1번만 실행

useEffect(() => {
  fetchPosts();
}, [user]);  // ← user가 바뀔 때마다 다시 실행
```

### 패턴 3: 조건부 렌더링 — if문 대신

```tsx
// 로딩 중이면 스피너 보여주고, 아니면 게시물 보여줌
{isLoading ? (
  <div>로딩 중...</div>        // ← if (isLoading) 일 때
) : (
  <div>게시물 목록</div>       // ← else 일 때
)}

// 로그인한 사용자만 보이는 버튼
{user && <button>글 작성</button>}   // ← user가 있을 때만 표시
```

### 패턴 4: `map()` — 반복 출력

```tsx
// 바닐라 JS: for문으로 DOM에 하나씩 추가
// React: map()으로 한 줄에 해결

{posts.map(post => (
  <PostCard key={post.id} post={post} />
  //        ↑고유키(필수)  ↑데이터 전달
))}
```

---

## 🎨 4단계: TailwindCSS 클래스 읽는 법

CSS를 파일에 따로 쓰는 대신, **HTML 태그에 직접 스타일 클래스**를 붙이는 방식입니다.

### 자주 쓰는 클래스 해석표

| TailwindCSS 클래스 | 일반 CSS 의미 | 설명 |
|---|---|---|
| `flex` | `display: flex` | 가로 배치 |
| `flex-col` | `flex-direction: column` | 세로 배치 |
| `items-center` | `align-items: center` | 세로 중앙 정렬 |
| `justify-between` | `justify-content: space-between` | 양 끝 정렬 |
| `space-x-3` | `gap: 0.75rem` (가로) | 요소 간 가로 간격 |
| `p-4` | `padding: 1rem` | 안쪽 여백 |
| `px-6` | `padding-left/right: 1.5rem` | 좌우 여백 |
| `py-3` | `padding-top/bottom: 0.75rem` | 상하 여백 |
| `m-2` | `margin: 0.5rem` | 바깥 여백 |
| `mt-4` | `margin-top: 1rem` | 위쪽 여백 |
| `w-full` | `width: 100%` | 전체 너비 |
| `h-10` | `height: 2.5rem` | 높이 |
| `rounded-xl` | `border-radius: 0.75rem` | 둥근 모서리 |
| `rounded-full` | `border-radius: 9999px` | 완전 원형 |
| `bg-white` | `background: white` | 배경색 |
| `bg-[#2A9D8F]` | `background: #2A9D8F` | 커스텀 색상 |
| `text-sm` | `font-size: 0.875rem` | 작은 글씨 |
| `text-lg` | `font-size: 1.125rem` | 큰 글씨 |
| `font-bold` | `font-weight: bold` | 굵은 글씨 |
| `hidden` | `display: none` | 숨기기 |
| `md:flex` | `@media(min-width:768px) { display:flex }` | 태블릿 이상에서만 보임 |
| `hover:bg-gray-100` | `:hover { background: ... }` | 마우스 올리면 변경 |
| `transition-all` | `transition: all` | 부드러운 전환 효과 |

### 실제 코드 해석 연습

```tsx
<button className="w-full py-3 bg-[#212529] text-white rounded-2xl text-xs font-black shadow-lg hover:bg-[#343a40] transition-all">
```

해석하면:
- `w-full` → 버튼 너비 100%
- `py-3` → 상하 패딩
- `bg-[#212529]` → 진한 검정 배경
- `text-white` → 흰색 글씨
- `rounded-2xl` → 둥근 모서리
- `text-xs` → 작은 글씨
- `font-black` → 매우 굵은 글씨
- `shadow-lg` → 큰 그림자
- `hover:bg-[#343a40]` → 마우스 올리면 색 변경
- `transition-all` → 변화가 부드럽게

---

## 🔥 5단계: Firebase 코드 읽는 법

### 데이터 가져오기 (읽기)
```tsx
// postService.ts 안에 있는 함수
const posts = await postService.getPosts(user.uid);
// → Firebase에서 게시물 목록을 가져옴
// → 바닐라 JS의 fetch('/api/posts') 와 같은 역할
```

### 데이터 저장하기 (쓰기)
```tsx
await postService.createPost(newPost);
// → Firebase에 새 게시물을 저장
// → 바닐라 JS의 fetch('/api/posts', { method: 'POST', body: ... }) 와 같음
```

### 실시간 구독 (채팅 등)
```tsx
// 새 메시지가 올 때마다 자동으로 콜백 함수 실행
messageService.subscribeToMessages(chatId, (messages) => {
  setMessages(messages);  // 새 메시지로 화면 자동 갱신
});
// → 바닐라 JS의 WebSocket과 비슷한 역할
```

---

## 📖 6단계: 실제 파일 읽기 연습 — feed/page.tsx

```tsx
"use client";                           // ① Next.js에게 "이건 브라우저에서 실행해" 라고 알려줌

import React, { useEffect, useState } from "react";   // ② 필요한 도구 가져오기
import { PostCard } from "@/components/features/feed/PostCard";  // ③ 게시물 카드 부품
import { postService } from "@/core/firebase/postService";       // ④ Firebase 게시물 함수
import { useAuth } from "@/core/hooks/useAuth";                  // ⑤ 로그인 상태 확인

export default function FeedPage() {    // ⑥ 이 페이지의 메인 함수 (= HTML 파일 1개)
  const { user } = useAuth();           // ⑦ 현재 로그인한 사용자 정보
  const [posts, setPosts] = useState([]);      // ⑧ 게시물 목록 (빈 배열로 시작)
  const [isLoading, setIsLoading] = useState(true);  // ⑨ 로딩 상태

  useEffect(() => {                     // ⑩ 페이지 열릴 때 자동 실행
    const fetchPosts = async () => {
      const data = await postService.getPosts(user?.uid);  // Firebase에서 가져옴
      setPosts(data);                   // 가져온 데이터로 화면 갱신
      setIsLoading(false);             // 로딩 끝
    };
    if (user) fetchPosts();
  }, [user]);

  return (                              // ⑪ 여기서부터 = 화면에 보이는 HTML
    <div className="flex flex-col">
      {isLoading ? (                    // ⑫ 로딩 중이면?
        <div>로딩 중...</div>
      ) : (                             // ⑬ 로딩 끝나면?
        posts.map(post => (             // ⑭ 게시물을 하나씩 반복
          <PostCard key={post.id} post={post} />
        ))
      )}
    </div>
  );
}
```

### 이 파일의 흐름 요약
```
페이지 열림 → useEffect 실행 → Firebase에서 데이터 가져옴
→ setPosts로 저장 → 화면이 자동으로 갱신됨 → posts.map으로 카드 반복 출력
```

---

## 🛠️ 7단계: 직접 수정해보기 (연습)

### 쉬운 수정 예시들

**1. 텍스트 바꾸기:**
파일에서 한글 텍스트를 찾아 바꾸면 됩니다.
```tsx
// 전: <h1>Discovery</h1>
// 후: <h1>지도 탐색</h1>
```

**2. 색상 바꾸기:**
`bg-[#2A9D8F]` 에서 `#2A9D8F`를 원하는 색상 코드로 변경
```tsx
// 전: className="bg-[#2A9D8F]"
// 후: className="bg-[#FF6B6B]"   ← 빨간계열로 변경
```

**3. 요소 숨기기/보이기:**
`hidden` 클래스를 추가하면 숨겨짐
```tsx
// 숨기기: className="hidden"
// 모바일에서만 숨기기: className="hidden md:block"
// PC에서만 숨기기: className="md:hidden"
```

---

## 📋 치트시트: 자주 보는 패턴 한눈에

| 코드 | 의미 |
|---|---|
| `"use client"` | 이 파일은 브라우저에서 실행됨 |
| `import ... from ...` | 다른 파일에서 도구 가져오기 |
| `export default function` | 이 페이지/컴포넌트의 시작점 |
| `const { user } = useAuth()` | 로그인한 사용자 정보 가져오기 |
| `useState(초기값)` | 변하는 데이터 만들기|
| `useEffect(() => {}, [])` | 페이지 로드 시 실행할 코드 |
| `return (JSX)` | 화면에 보여줄 HTML 반환 |
| `{변수}` | 자바스크립트 값을 HTML에 표시 |
| `{조건 && <태그/>}` | 조건이 true일 때만 표시 |
| `{조건 ? A : B}` | 조건에 따라 A 또는 B 표시 |
| `{배열.map(item => ...)}` | 배열을 반복해서 표시 |
| `className="..."` | HTML의 class와 동일 (CSS 적용) |
| `onClick={() => ...}` | 클릭 이벤트 |
| `<컴포넌트 prop={값}/>` | 부품에 데이터 전달 |
