import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "이메일과 인증번호가 필요합니다." },
        { status: 400 }
      );
    }

    // 이메일 전송을 위한 설정 (Gmail 기준)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // 앱 비밀번호를 사용해야 함
      },
    });

    const mailOptions = {
      from: `"SNS Project" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "[SNS Project] 이메일 인증 번호안내",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0d9488; text-align: center;">이메일 인증 안내</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            안녕하세요! SNS Project 가입을 위한 인증번호입니다.<br/>
            아래의 인증번호를 회원가입 화면에 입력해 주세요.
          </p>
          <div style="background-color: #f0fdfa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f766e;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center;">
            인증번호는 발송 후 일정 시간이 지나면 만료될 수 있습니다.<br/>
            요청한 적이 없다면 이 메일을 무시하셔도 됩니다.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("이메일 발송 오류:", error);
    return NextResponse.json(
      { error: "이메일 발송에 실패했습니다." },
      { status: 500 }
    );
  }
}
