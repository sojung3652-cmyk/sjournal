# Supabase Auth email templates (English default + Korean)

Paste these into **Supabase Dashboard → Authentication → Emails → Templates**.
They can't be set through the Supabase MCP tools, so this is a manual step.

How the language is chosen: on signup the app sends `options.data.locale` (`"en"` or `"ko"`,
the language the visitor was using). Supabase stores it in `raw_user_meta_data`, which templates
can read as `{{ .Data.locale }}`. Anything other than `"ko"` gets English.

> Note: `.Data` is the user's metadata *at signup*. If someone later switches the app language,
> `profiles.locale` changes but the email language stays what they signed up with.

Also check **Authentication → URL Configuration → Redirect URLs** contains
`http://localhost:3000/auth/callback` and your deployed `https://<domain>/auth/callback`
(the reset flow uses `/auth/callback?next=/auth/reset`).

---

## 1. Confirm signup

**Subject**

```
{{ if eq .Data.locale "ko" }}Study Journal 이메일 인증{{ else }}Confirm your Study Journal email{{ end }}
```

**Body (HTML)**

```html
{{ if eq .Data.locale "ko" }}
<h2>이메일 주소를 인증해 주세요</h2>
<p>Study Journal에 가입해 주셔서 감사합니다. 아래 버튼을 누르면 인증이 끝나고 바로 로그인됩니다.</p>
<p><a href="{{ .ConfirmationURL }}">이메일 인증하기</a></p>
<p>직접 가입하지 않으셨다면 이 메일은 무시하셔도 됩니다.</p>
{{ else }}
<h2>Confirm your email</h2>
<p>Thanks for signing up for Study Journal. Click the button below to confirm your address and log in.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email</a></p>
<p>If you didn't sign up, you can ignore this email.</p>
{{ end }}
```

## 2. Reset password

**Subject**

```
{{ if eq .Data.locale "ko" }}Study Journal 비밀번호 재설정{{ else }}Reset your Study Journal password{{ end }}
```

**Body (HTML)**

```html
{{ if eq .Data.locale "ko" }}
<h2>비밀번호 재설정</h2>
<p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 링크는 1시간 동안 유효합니다.</p>
<p><a href="{{ .ConfirmationURL }}">새 비밀번호 설정하기</a></p>
<p>요청하지 않으셨다면 이 메일은 무시하셔도 됩니다. 비밀번호는 바뀌지 않습니다.</p>
{{ else }}
<h2>Reset your password</h2>
<p>We received a request to reset your password. Click the button below to choose a new one. The link is valid for 1 hour.</p>
<p><a href="{{ .ConfirmationURL }}">Set a new password</a></p>
<p>If you didn't ask for this, you can ignore this email — your password won't change.</p>
{{ end }}
```

## 3. Magic link / email change (optional)

Not used by the app today. If enabled later, reuse the same `{{ if eq .Data.locale "ko" }} … {{ else }} … {{ end }}` pattern.

## Testing

Supabase's built-in email sender only delivers to members of the project's organization and is
rate-limited. For real users, set up custom SMTP (Authentication → Emails → SMTP Settings).
